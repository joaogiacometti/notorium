import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AssistantWorkspaceProvider } from "@/components/assistant/assistant-workspace-provider";
import { FlashcardEditorDialogContent } from "@/components/flashcards/dialogs/flashcard-editor-dialog-content";
import { Dialog } from "@/components/ui/dialog";

function DialogWithToolbar() {
  return (
    <Dialog open>
      <FlashcardEditorDialogContent title="New flashcard">
        <button type="button" disabled>
          Subject
        </button>
        <button type="button">Heading 1</button>
      </FlashcardEditorDialogContent>
    </Dialog>
  );
}

describe("FlashcardEditorDialogContent", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false });
  });

  it.each([
    ["standalone", false],
    ["inside the assistant workspace", true],
  ])(
    "opens without focusing a toolbar control (%s)",
    async (_label, withWorkspace) => {
      const dialog = <DialogWithToolbar />;
      await act(async () =>
        root.render(
          withWorkspace ? (
            <AssistantWorkspaceProvider>{dialog}</AssistantWorkspaceProvider>
          ) : (
            dialog
          ),
        ),
      );

      expect(document.activeElement?.getAttribute("role")).toBe("dialog");
    },
  );
});
