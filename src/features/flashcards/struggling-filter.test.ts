import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import {
  buildStrugglingFlashcardFilter,
  STRUGGLING_LAPSE_THRESHOLD,
  STRUGGLING_RECOVERY_STREAK,
} from "@/features/flashcards/struggling-filter";

describe("buildStrugglingFlashcardFilter", () => {
  const query = new PgDialect().sqlToQuery(
    buildStrugglingFlashcardFilter("user-1"),
  );

  it("requires the leech lapse threshold and an unbroken recovery window", () => {
    expect(query.params).toEqual([
      STRUGGLING_LAPSE_THRESHOLD,
      "user-1",
      STRUGGLING_RECOVERY_STREAK,
      "good",
      "easy",
      STRUGGLING_RECOVERY_STREAK,
    ]);
  });
});
