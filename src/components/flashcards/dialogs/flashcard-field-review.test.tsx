import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import { FlashcardFieldReview } from "@/components/flashcards/dialogs/flashcard-field-review";

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
              original: "<p>Original</p>",
              replacement: `<p>${replacement}</p>`,
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
