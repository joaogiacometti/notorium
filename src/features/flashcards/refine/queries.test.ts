import { describe, expect, it } from "vitest";
import { REFINE_CARD_LIMIT } from "@/features/flashcards/refine/constants";
import {
  hasRecovered,
  parseRecentRatings,
  selectStrugglingRows,
} from "@/features/flashcards/refine/queries";

function buildLeechRow(id: string, recentRatings: string[] | string) {
  return {
    id,
    front: `front-${id}`,
    back: `back-${id}`,
    subjectId: "subject-1",
    subjectName: "Subject",
    reviewCount: 12,
    lapseCount: 5,
    recentRatings,
  };
}

describe("hasRecovered", () => {
  it("is true after three consecutive good/easy ratings", () => {
    expect(hasRecovered(["good", "easy", "good"])).toBe(true);
  });

  it("is false when a recent again or hard breaks the streak", () => {
    expect(hasRecovered(["good", "again", "good"])).toBe(false);
    expect(hasRecovered(["hard", "good", "good"])).toBe(false);
  });

  it("is false with fewer than three ratings", () => {
    expect(hasRecovered(["good", "good"])).toBe(false);
    expect(hasRecovered([])).toBe(false);
  });

  it("only inspects the most recent ratings", () => {
    expect(hasRecovered(["good", "good", "good", "again"])).toBe(true);
  });
});

describe("parseRecentRatings", () => {
  it("passes through arrays unchanged", () => {
    expect(parseRecentRatings(["good", "easy"])).toEqual(["good", "easy"]);
  });

  it("parses Postgres array literals", () => {
    expect(parseRecentRatings("{good,easy,again}")).toEqual([
      "good",
      "easy",
      "again",
    ]);
  });

  it("returns an empty array for an empty literal", () => {
    expect(parseRecentRatings("{}")).toEqual([]);
  });
});

describe("selectStrugglingRows", () => {
  it("keeps leeches that have not recovered, in input order", () => {
    const cards = selectStrugglingRows([
      buildLeechRow("a", ["again", "good", "good"]),
      buildLeechRow("b", "{good,good,easy}"),
      buildLeechRow("c", []),
    ]);

    expect(cards.map((card) => card.id)).toEqual(["a", "c"]);
  });

  it("caps the list at the configured limit", () => {
    const rows = Array.from({ length: REFINE_CARD_LIMIT + 5 }, (_, index) =>
      buildLeechRow(`card-${index}`, ["again"]),
    );

    expect(selectStrugglingRows(rows)).toHaveLength(REFINE_CARD_LIMIT);
  });

  it("strips recentRatings from the returned cards", () => {
    const [card] = selectStrugglingRows([buildLeechRow("a", ["again"])]);

    expect(card).not.toHaveProperty("recentRatings");
  });
});
