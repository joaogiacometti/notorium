import { describe, expect, it } from "vitest";
import {
  formatLibraryHitsForModel,
  type LibraryHit,
  librarySearchInputSchema,
} from "@/features/assistant/library-search-contract";
import { LIMITS } from "@/lib/config/limits";

const mitosisCard: LibraryHit = {
  kind: "flashcard",
  id: "card-1",
  subjectId: "subject-1",
  title: "What is mitosis?",
  subjectPath: "Biology::Cells",
  snippet: "Cell division into two identical cells.",
};

describe("librarySearchInputSchema", () => {
  it("trims terms and accepts an optional kind filter", () => {
    expect(
      librarySearchInputSchema.parse({
        terms: [" mitose ", "mitosis"],
        kinds: ["flashcard"],
      }),
    ).toEqual({ terms: ["mitose", "mitosis"], kinds: ["flashcard"] });
  });

  it("rejects too many, too short, or unknown inputs", () => {
    const tooMany = Array(LIMITS.assistantLibrarySearchTermsMax + 1).fill(
      "cell",
    );

    for (const input of [
      { terms: tooMany },
      { terms: ["a"] },
      { terms: [] },
      { terms: ["cell"], kinds: ["subject"] },
    ]) {
      expect(librarySearchInputSchema.safeParse(input).success).toBe(false);
    }
  });
});

describe("formatLibraryHitsForModel", () => {
  it("lists hits as quoted data without ids", () => {
    const text = formatLibraryHitsForModel({ hits: [mitosisCard] });

    expect(text).toContain(
      '1. flashcard "What is mitosis?" in "Biology::Cells": "Cell division into two identical cells."',
    );
    expect(text).not.toContain("card-1");
    expect(text).not.toContain("subject-1");
  });

  it("says so when nothing matched", () => {
    expect(formatLibraryHitsForModel({ hits: [] })).toBe(
      "No matching notes, flashcards, or mindmaps.",
    );
  });
});
