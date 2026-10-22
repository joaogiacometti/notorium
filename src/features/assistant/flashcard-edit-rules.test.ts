import { describe, expect, it } from "vitest";
import type { FlashcardDraft } from "@/features/assistant/edit-contract";
import { findFlashcardEditProblems } from "@/features/assistant/flashcard-edit-rules";

const draft: FlashcardDraft = {
  sessionId: "d",
  revision: 3,
  front: "<p>What is ATP?</p>",
  back: "<p>Energy carrier.</p>{{IMAGE_0}}",
};

describe("flashcard edit rules", () => {
  it("accepts a changed field that keeps its own images", () => {
    expect(
      findFlashcardEditProblems(
        { sessionId: "d", revision: 3, back: "<p>Energy.</p>{{IMAGE_0}}" },
        draft,
      ),
    ).toEqual([]);
  });

  it("rejects unchanged fields, stale identity, and invented images", () => {
    expect(
      findFlashcardEditProblems(
        {
          sessionId: "d",
          revision: 2,
          front: "<p>What is ATP?</p>\n",
          back: "<p>Energy.</p>{{IMAGE_1}}",
        },
        draft,
      ),
    ).toEqual([
      "revision 2 is not the current draft; expected 3",
      "front keeps the current content; expected changed HTML, or omit front",
      "back: Unknown image placeholder {{IMAGE_1}}; expected one of {{IMAGE_0}}",
    ]);
  });
});
