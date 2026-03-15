import { describe, expect, it } from "vitest";
import {
  getFlashcardReviewShortcutAction,
  isEditableFlashcardReviewKeyboardTarget,
} from "@/features/flashcard-review/shortcuts";

const defaultInput = {
  key: "Enter",
  revealed: false,
  hasCurrentCard: true,
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

describe("isEditableFlashcardReviewKeyboardTarget", () => {
  it("detects form controls and contenteditable elements", () => {
    const input = document.createElement("input");
    const contentEditable = document.createElement("div");
    contentEditable.setAttribute("contenteditable", "true");

    expect(isEditableFlashcardReviewKeyboardTarget(input)).toBe(true);
    expect(isEditableFlashcardReviewKeyboardTarget(contentEditable)).toBe(true);
  });

  it("detects nested elements inside an editable container", () => {
    const editor = document.createElement("div");
    editor.setAttribute("contenteditable", "true");
    const child = document.createElement("span");
    editor.append(child);

    expect(isEditableFlashcardReviewKeyboardTarget(child)).toBe(true);
  });

  it("ignores non-editable targets", () => {
    const button = document.createElement("button");

    expect(isEditableFlashcardReviewKeyboardTarget(button)).toBe(false);
    expect(isEditableFlashcardReviewKeyboardTarget(null)).toBe(false);
  });
});
