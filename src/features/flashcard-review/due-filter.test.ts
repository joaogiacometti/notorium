import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { buildDueAtFilter } from "@/features/flashcard-review/due-filter";

describe("buildDueAtFilter", () => {
  it("counts cards due now plus learning cards inside the 20-minute learn-ahead window", () => {
    const now = new Date("2026-04-12T14:00:00.000Z");

    const query = new PgDialect().sqlToQuery(buildDueAtFilter(now));

    expect(query.params).toEqual([
      new Date("2026-04-12T14:20:00.000Z").toISOString(),
      now.toISOString(),
      "learning",
      "relearning",
    ]);
  });
});
