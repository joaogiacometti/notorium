import { describe, expect, it } from "vitest";
import { REFINE_GROUP_LIMIT } from "@/features/flashcards/refine/constants";
import {
  classifyRefineStreak,
  groupRefineRows,
  parseRecentRatings,
} from "@/features/flashcards/refine/queries";

function buildStreakRow(id: string, recentRatings: string[]) {
  return {
    id,
    front: `front-${id}`,
    back: `back-${id}`,
    subjectId: "deck-1",
    subjectName: "Subject",
    reviewCount: recentRatings.length,
    lapseCount: 0,
    recentRatings,
  };
}

describe("classifyRefineStreak", () => {
  it("classifies three consecutive good/easy ratings as mastered", () => {
    expect(classifyRefineStreak(["good", "easy", "good"])).toBe("mastered");
  });

  it("classifies three consecutive again ratings as struggling", () => {
    expect(classifyRefineStreak(["again", "again", "again"])).toBe(
      "struggling",
    );
  });

  it("treats hard as neutral and breaks both streaks", () => {
    expect(classifyRefineStreak(["hard", "good", "good"])).toBeNull();
    expect(classifyRefineStreak(["hard", "again", "again"])).toBeNull();
  });

  it("returns null when a recent miss breaks a mastered streak", () => {
    expect(classifyRefineStreak(["again", "good", "good"])).toBeNull();
  });

  it("returns null for cards with fewer than three reviews", () => {
    expect(classifyRefineStreak(["good", "good"])).toBeNull();
    expect(classifyRefineStreak([])).toBeNull();
  });

  it("only inspects the most recent ratings", () => {
    expect(classifyRefineStreak(["good", "good", "good", "again"])).toBe(
      "mastered",
    );
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

describe("groupRefineRows", () => {
  it("classifies rows whose ratings arrive as Postgres array literals", () => {
    const groups = groupRefineRows([
      { ...buildStreakRow("a", []), recentRatings: "{good,good,easy}" },
    ]);

    expect(groups.mastered.map((card) => card.id)).toEqual(["a"]);
  });

  it("splits rows into mastered and struggling groups", () => {
    const groups = groupRefineRows([
      buildStreakRow("a", ["good", "good", "easy"]),
      buildStreakRow("b", ["again", "again", "again"]),
      buildStreakRow("c", ["good", "again", "good"]),
    ]);

    expect(groups.mastered.map((card) => card.id)).toEqual(["a"]);
    expect(groups.struggling.map((card) => card.id)).toEqual(["b"]);
  });

  it("caps each group at the configured limit", () => {
    const rows = Array.from({ length: REFINE_GROUP_LIMIT + 5 }, (_, index) =>
      buildStreakRow(`card-${index}`, ["good", "good", "good"]),
    );

    expect(groupRefineRows(rows).mastered).toHaveLength(REFINE_GROUP_LIMIT);
  });

  it("strips recentRatings from the returned summaries", () => {
    const groups = groupRefineRows([
      buildStreakRow("a", ["good", "good", "good"]),
    ]);

    expect(groups.mastered[0]).not.toHaveProperty("recentRatings");
  });
});
