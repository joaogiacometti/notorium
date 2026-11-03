import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import { FlashcardFieldReview } from "@/components/flashcards/dialogs/flashcard-field-review";
import { testDocument } from "@/test/document";

it("updates the visible review when a later proposal replaces it", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    for (const replacement of ["First suggestion", "Second suggestion"]) {
      await act(async () =>
        root.render(
          <FlashcardFieldReview
            field="back"
            proposal={{
              original: testDocument("<p>Original</p>"),
              replacement: testDocument(`<p>${replacement}</p>`),
            }}
            onDecide={() => {}}
          />,
        ),
      );
      expect(container.querySelector(".tiptap")?.textContent).toContain(
        replacement,
      );
    }
    expect(container.querySelector(".tiptap")?.textContent).not.toContain(
      "First suggestion",
    );
  } finally {
    await act(async () => root.unmount());
    container.remove();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false });
  }
});
