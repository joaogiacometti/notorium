import { act, useState } from "react";
import { createPortal } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AssistantAppFrame } from "@/components/assistant/assistant-app-frame";
import { AssistantSurfaceHost } from "@/components/assistant/assistant-surface-host";
import { useAssistantWorkspace } from "@/components/assistant/assistant-workspace-context";
import { AssistantWorkspaceProvider } from "@/components/assistant/assistant-workspace-provider";
import { useAssistantPortalTarget } from "@/components/assistant/use-assistant-portal-target";
import { FlashcardEditorDialogContent } from "@/components/flashcards/dialogs/flashcard-editor-dialog-content";
import { Dialog, DialogTitle } from "@/components/ui/dialog";

function StatefulChat() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <header>Assistant</header>
      <button type="button" onClick={() => setCount(count + 1)}>
        Conversation {count}
      </button>
      <p aria-live="polite">Messages</p>
      <textarea aria-label="Assistant message" />
    </div>
  );
}

function PortalHarness({
  nested,
  modal = false,
}: Readonly<{ nested: boolean; modal?: boolean }>) {
  const workspace = useAssistantWorkspace();
  const portal = useAssistantPortalTarget(
    workspace?.host ?? null,
    true,
    workspace?.registerPortalTarget,
  );
  return (
    <AssistantAppFrame>
      <div data-testid="fallback" ref={portal.fallbackRef} />
      <section aria-label="Review">
        <AssistantSurfaceHost />
      </section>
      {nested && !modal ? (
        <section aria-label="Editor">
          <AssistantSurfaceHost />
        </section>
      ) : null}
      {modal ? (
        <Dialog open={nested}>
          <FlashcardEditorDialogContent>
            <DialogTitle>Edit flashcard</DialogTitle>
          </FlashcardEditorDialogContent>
        </Dialog>
      ) : null}
      {portal.target ? createPortal(<StatefulChat />, portal.target) : null}
    </AssistantAppFrame>
  );
}

describe("global assistant surface hosts", () => {
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

  async function render(nested: boolean, modal = false) {
    await act(async () =>
      root.render(
        <AssistantWorkspaceProvider>
          <PortalHarness nested={nested} modal={modal} />
        </AssistantWorkspaceProvider>,
      ),
    );
  }

  it("moves the same chat into a nested editor and restores review without remounting", async () => {
    await render(false);
    const button = container.querySelector("button");
    expect(button?.closest("section")?.getAttribute("aria-label")).toBe(
      "Review",
    );
    await act(async () => button?.click());
    expect(button?.textContent).toBe("Conversation 1");
    await render(true);
    expect(container.querySelector("button")).toBe(button);
    expect(button?.closest("section")?.getAttribute("aria-label")).toBe(
      "Editor",
    );
    expect(button?.textContent).toBe("Conversation 1");
    await render(false);
    expect(container.querySelector("button")).toBe(button);
    expect(button?.closest("section")?.getAttribute("aria-label")).toBe(
      "Review",
    );
  });
  it("keeps the entire assistant accessible when the modal hides background content", async () => {
    await render(false, true);
    const composer = document.querySelector('[aria-label="Assistant message"]');
    await render(true, true);
    expect(document.querySelector('[aria-label="Assistant message"]')).toBe(
      composer,
    );
    expect(composer?.closest('[role="dialog"]')).not.toBeNull();
    expect(composer?.closest('[aria-hidden="true"]')).toBeNull();
    await render(false, true);
    expect(document.querySelector('[aria-label="Assistant message"]')).toBe(
      composer,
    );
    expect(composer?.closest('[aria-hidden="true"]')).toBeNull();
  });
});
