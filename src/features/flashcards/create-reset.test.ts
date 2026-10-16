import { describe, expect, it } from "vitest";
import { getCreateFlashcardResetValues } from "@/features/flashcards/create-reset";
import type { FlashcardFormValues } from "@/features/flashcards/validation";

const values: FlashcardFormValues = {
  subjectId: "deck-1",
  front: "<p>Front</p>",
  back: "<p>Back</p>",
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
      front: "",
      back: "",
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
      front: "<p>Front</p>",
      back: "",
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
      front: "",
      back: "<p>Back</p>",
    });
  });
});
