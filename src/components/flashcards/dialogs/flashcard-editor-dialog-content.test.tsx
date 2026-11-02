import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AssistantComposer } from "@/components/assistant/assistant-composer";
import { useAssistantWorkspace } from "@/components/assistant/assistant-workspace-context";
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

function DialogWithComposer() {
  const workspace = useAssistantWorkspace();
  if (!workspace) return null;
  return (
    <Dialog open>
      <FlashcardEditorDialogContent title="New flashcard">
        <section data-study-assistant>
          <button type="button" onClick={() => workspace.setOpen(true)}>
            Open assistant
          </button>
          <output aria-label="Assistant open">{String(workspace.open)}</output>
          <AssistantComposer
            busy={false}
            onSend={workspace.send}
            onStop={() => {}}
            onNewChat={workspace.reset}
          />
        </section>
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

  it("dismisses composer suggestions before minimizing the assistant inside a dialog", async () => {
    await act(async () =>
      root.render(
        <AssistantWorkspaceProvider>
          <DialogWithComposer />
        </AssistantWorkspaceProvider>,
      ),
    );
    await act(async () => {
      document
        .querySelector<HTMLButtonElement>(
          "section[data-study-assistant] button",
        )
        ?.click();
    });
    const textarea = document.querySelector("textarea");
    await act(async () => {
      textarea?.focus();
      Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value",
      )?.set?.call(textarea, "/n");
      textarea?.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(document.querySelector('[role="listbox"]')).not.toBeNull();
    await act(async () => {
      textarea?.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Escape",
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    expect(document.querySelector('[role="listbox"]')).toBeNull();
    expect(
      document.querySelector('[aria-label="Assistant open"]')?.textContent,
    ).toBe("true");
    expect(textarea?.value).toBe("/n");
    await act(async () => {
      textarea?.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Escape",
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    expect(
      document.querySelector('[aria-label="Assistant open"]')?.textContent,
    ).toBe("false");
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });
});
