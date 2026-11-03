import { describe, expect, it } from "vitest";
import { getCreateFlashcardResetValues } from "@/features/flashcards/create-reset";
import type { FlashcardFormValues } from "@/features/flashcards/validation";
import { testDocument } from "@/test/document";

const values: FlashcardFormValues = {
  subjectId: "deck-1",
  front: testDocument("<p>Front</p>"),
  back: testDocument("<p>Back</p>"),
};

describe("getCreateFlashcardResetValues", () => {
  it("keeps deck and clears both fields when both toggles are off", () => {
    expect(
      getCreateFlashcardResetValues(values, {
        keepFrontAfterSubmit: false,
        keepBackAfterSubmit: false,
      }),
    ).toEqual({
      subjectId: "deck-1",
      front: testDocument(""),
      back: testDocument(""),
    });
  });

  it("keeps only front when front toggle is on", () => {
    expect(
      getCreateFlashcardResetValues(values, {
        keepFrontAfterSubmit: true,
        keepBackAfterSubmit: false,
      }),
    ).toEqual({
      subjectId: "deck-1",
      front: testDocument("<p>Front</p>"),
      back: testDocument(""),
    });
  });

  it("keeps only back when back toggle is on", () => {
    expect(
      getCreateFlashcardResetValues(values, {
        keepFrontAfterSubmit: false,
        keepBackAfterSubmit: true,
      }),
    ).toEqual({
      subjectId: "deck-1",
      front: testDocument(""),
      back: testDocument("<p>Back</p>"),
    });
  });
});
