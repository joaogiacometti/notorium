import { describe, expect, it } from "vitest";
import { getFlashcardReviewShortcutAction } from "@/features/flashcard-review/shortcuts";

const defaultInput = {
  key: "Enter",
  revealed: false,
  hasCurrentCard: true,
  canUndoReview: true,
  isPending: false,
  isDialogOpen: false,
  isEditableTarget: false,
  hasModifierKey: false,
  isRepeat: false,
} as const;

describe("getFlashcardReviewShortcutAction", () => {
  it("reveals the back on Enter when the answer is hidden", () => {
    expect(
      getFlashcardReviewShortcutAction({
        ...defaultInput,
      }),
    ).toEqual({ type: "reveal" });
  });

  it("reveals the back on Space when the answer is hidden", () => {
    expect(
      getFlashcardReviewShortcutAction({
        ...defaultInput,
        key: " ",
      }),
    ).toEqual({ type: "reveal" });
  });

  it("grades good on Enter when the answer is visible", () => {
    expect(
      getFlashcardReviewShortcutAction({
        ...defaultInput,
        revealed: true,
      }),
    ).toEqual({ type: "grade", grade: "good" });
  });

  it("grades good on Space when the answer is visible", () => {
    expect(
      getFlashcardReviewShortcutAction({
        ...defaultInput,
        key: " ",
        revealed: true,
      }),
    ).toEqual({ type: "grade", grade: "good" });
  });

  it("opens edit on e when shortcuts are allowed", () => {
    expect(
      getFlashcardReviewShortcutAction({
        ...defaultInput,
        key: "e",
      }),
    ).toEqual({ type: "edit" });
  });

  it("opens edit on e when the answer is visible", () => {
    expect(
      getFlashcardReviewShortcutAction({
        ...defaultInput,
        key: "e",
        revealed: true,
      }),
    ).toEqual({ type: "edit" });
  });

  it("opens delete on d when shortcuts are allowed", () => {
    expect(
      getFlashcardReviewShortcutAction({
        ...defaultInput,
        key: "d",
      }),
    ).toEqual({ type: "delete" });
  });

  it("opens delete on d when the answer is visible", () => {
    expect(
      getFlashcardReviewShortcutAction({
        ...defaultInput,
        key: "d",
        revealed: true,
      }),
    ).toEqual({ type: "delete" });
  });

  it("opens reset on r when shortcuts are allowed", () => {
    expect(
      getFlashcardReviewShortcutAction({
        ...defaultInput,
        key: "r",
      }),
    ).toEqual({ type: "reset" });
  });

  it("opens reset on r when the answer is visible", () => {
    expect(
      getFlashcardReviewShortcutAction({
        ...defaultInput,
        key: "r",
        revealed: true,
      }),
    ).toEqual({ type: "reset" });
  });

  it("undoes the last review on u, even with no current card", () => {
    expect(
      getFlashcardReviewShortcutAction({
        ...defaultInput,
        key: "u",
        hasCurrentCard: false,
      }),
    ).toEqual({ type: "undo" });
  });

  it("ignores u when there is nothing to undo", () => {
    expect(
      getFlashcardReviewShortcutAction({
        ...defaultInput,
        key: "u",
        canUndoReview: false,
      }),
    ).toBeNull();
  });

  it("maps 1 through 4 to the expected grades when revealed", () => {
    expect(
      getFlashcardReviewShortcutAction({
        ...defaultInput,
        key: "1",
        revealed: true,
      }),
    ).toEqual({ type: "grade", grade: "again" });
    expect(
      getFlashcardReviewShortcutAction({
        ...defaultInput,
        key: "2",
        revealed: true,
      }),
    ).toEqual({ type: "grade", grade: "hard" });
    expect(
      getFlashcardReviewShortcutAction({
        ...defaultInput,
        key: "3",
        revealed: true,
      }),
    ).toEqual({ type: "grade", grade: "good" });
    expect(
      getFlashcardReviewShortcutAction({
        ...defaultInput,
        key: "4",
        revealed: true,
      }),
    ).toEqual({ type: "grade", grade: "easy" });
  });

  it("ignores numeric grades while the answer is hidden", () => {
    expect(
      getFlashcardReviewShortcutAction({
        ...defaultInput,
        key: "1",
      }),
    ).toBeNull();
  });

  it("ignores uppercase E", () => {
    expect(
      getFlashcardReviewShortcutAction({
        ...defaultInput,
        key: "E",
      }),
    ).toBeNull();
  });

  it("ignores uppercase D", () => {
    expect(
      getFlashcardReviewShortcutAction({
        ...defaultInput,
        key: "D",
      }),
    ).toBeNull();
  });

  it("opens reset on uppercase R", () => {
    expect(
      getFlashcardReviewShortcutAction({
        ...defaultInput,
        key: "R",
      }),
    ).toEqual({ type: "reset" });
  });

  it("ignores shortcuts when no current card is available", () => {
    expect(
      getFlashcardReviewShortcutAction({
        ...defaultInput,
        hasCurrentCard: false,
      }),
    ).toBeNull();
  });

  it("ignores shortcuts while a review mutation is pending", () => {
    expect(
      getFlashcardReviewShortcutAction({
        ...defaultInput,
        key: "e",
        isPending: true,
      }),
    ).toBeNull();
  });

  it("ignores shortcuts while the edit dialog is open", () => {
    expect(
      getFlashcardReviewShortcutAction({
        ...defaultInput,
        key: "e",
        isDialogOpen: true,
      }),
    ).toBeNull();
  });

  it("ignores shortcuts when the focused target is editable", () => {
    expect(
      getFlashcardReviewShortcutAction({
        ...defaultInput,
        key: "e",
        isEditableTarget: true,
      }),
    ).toBeNull();
  });

  it("ignores shortcuts when modifier keys are pressed", () => {
    expect(
      getFlashcardReviewShortcutAction({
        ...defaultInput,
        key: "e",
        hasModifierKey: true,
      }),
    ).toBeNull();
  });

  it("ignores repeated keydown events", () => {
    expect(
      getFlashcardReviewShortcutAction({
        ...defaultInput,
        key: "e",
        isRepeat: true,
      }),
    ).toBeNull();
  });

  it("ignores unrelated keys", () => {
    expect(
      getFlashcardReviewShortcutAction({
        ...defaultInput,
        revealed: true,
        key: "a",
      }),
    ).toBeNull();
  });
});
