import { describe, expect, it, vi } from "vitest";
import { getCreateFlashcardFormValues } from "@/components/flashcards/dialogs/use-create-flashcard-form";
import { flashcardFormSchema } from "@/features/flashcards/validation";

vi.mock("@/app/actions/flashcards", () => ({ createFlashcard: vi.fn() }));

describe("getCreateFlashcardFormValues", () => {
  it("keeps proposal sources through the editable create form and validation", () => {
    const source = { kind: "note" as const, id: "note-1" };
    const values = getCreateFlashcardFormValues("subject-1", {
      front: "<p>Q</p>",
      back: "<p>A</p>",
      source,
    });
    expect(flashcardFormSchema.parse(values).source).toEqual(source);
  });
  it("leaves ordinary new cards without a source", () => {
    expect(getCreateFlashcardFormValues()).toEqual({
      subjectId: "",
      front: "",
      back: "",
    });
  });
});
