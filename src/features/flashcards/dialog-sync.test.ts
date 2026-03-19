import { describe, expect, it } from "vitest";
import {
  haveFlashcardDialogValuesChanged,
  shouldSyncFlashcardDialogValues,
} from "@/features/flashcards/dialog-sync";

const createValues = {
  subjectId: "subject-1",
  front: "",
  back: "",
};

describe("haveFlashcardDialogValuesChanged", () => {
  it("returns false when flashcard dialog values are unchanged", () => {
    expect(
      haveFlashcardDialogValuesChanged(createValues, {
        subjectId: "subject-1",
        front: "",
        back: "",
      }),
    ).toBe(false);
  });

  it("returns true when any tracked field changes", () => {
    expect(
      haveFlashcardDialogValuesChanged(createValues, {
        subjectId: "subject-2",
        front: "",
        back: "",
      }),
    ).toBe(true);

    expect(
      haveFlashcardDialogValuesChanged(createValues, {
        subjectId: "subject-1",
        front: "<p>Front</p>",
        back: "",
      }),
    ).toBe(true);

    expect(
      haveFlashcardDialogValuesChanged(createValues, {
        subjectId: "subject-1",
        front: "",
        back: "<p>Back</p>",
      }),
    ).toBe(true);
  });
});

describe("shouldSyncFlashcardDialogValues", () => {
  it("syncs when the dialog opens", () => {
    expect(
      shouldSyncFlashcardDialogValues({
        open: true,
        wasOpen: false,
        previousValues: createValues,
        nextValues: createValues,
      }),
    ).toBe(true);
  });

  it("does not sync when create success leaves the dialog open with the same source values", () => {
    expect(
      shouldSyncFlashcardDialogValues({
        open: true,
        wasOpen: true,
        previousValues: createValues,
        nextValues: {
          subjectId: "subject-1",
          front: "",
          back: "",
        },
      }),
    ).toBe(false);
  });

  it("syncs when external values change while the dialog is open", () => {
    expect(
      shouldSyncFlashcardDialogValues({
        open: true,
        wasOpen: true,
        previousValues: {
          id: "flashcard-1",
          subjectId: "subject-1",
          front: "<p>Front</p>",
          back: "<p>Back</p>",
        },
        nextValues: {
          id: "flashcard-2",
          subjectId: "subject-2",
          front: "<p>Other front</p>",
          back: "<p>Other back</p>",
        },
      }),
    ).toBe(true);
  });

  it("does not sync while closed", () => {
    expect(
      shouldSyncFlashcardDialogValues({
        open: false,
        wasOpen: true,
        previousValues: createValues,
        nextValues: {
          subjectId: "subject-2",
          front: "",
          back: "",
        },
      }),
    ).toBe(false);
  });
});
