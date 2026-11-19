import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

let startedToday = 0;
let whereCondition: SQL | undefined;
const selectMock = vi.fn(() => ({
  from: () => ({
    where: (condition: SQL) => {
      whereCondition = condition;
      return Promise.resolve([{ count: startedToday }]);
    },
  }),
}));

vi.mock("@/db/index", () => ({ getDb: () => ({ select: selectMock }) }));

const { getRemainingNewCardsForToday } = await import(
  "@/features/flashcard-review/new-card-limit"
);

describe("getRemainingNewCardsForToday", () => {
  beforeEach(() => {
    startedToday = 0;
    whereCondition = undefined;
    selectMock.mockClear();
  });

  it("subtracts the new cards already started today from the limit", async () => {
    startedToday = 7;

    await expect(
      getRemainingNewCardsForToday("user-1", new Date(), "UTC", 20),
    ).resolves.toBe(13);
  });

  it("never goes below zero after the limit is lowered", async () => {
    startedToday = 30;

    await expect(
      getRemainingNewCardsForToday("user-1", new Date(), "UTC", 20),
    ).resolves.toBe(0);
  });

  it("allows no new cards at a limit of zero without querying", async () => {
    await expect(
      getRemainingNewCardsForToday("user-1", new Date(), "UTC", 0),
    ).resolves.toBe(0);
    expect(selectMock).not.toHaveBeenCalled();
  });

  it("counts reviews from the account's local day, not the UTC day", async () => {
    // 01:30 UTC on the 9th is still the evening of the 8th in São Paulo.
    await getRemainingNewCardsForToday(
      "user-1",
      new Date("2026-03-09T01:30:00.000Z"),
      "America/Sao_Paulo",
      20,
    );

    const { params } = new PgDialect().sqlToQuery(whereCondition as SQL);
    expect(params).toContain("2026-03-08");
    expect(params).toContain("America/Sao_Paulo");
  });
});
