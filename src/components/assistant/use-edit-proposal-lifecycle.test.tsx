import { useChat } from "@ai-sdk/react";
import { act, Suspense, useState, useTransition } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import { useEditProposalLifecycle } from "@/components/assistant/use-edit-proposal-lifecycle";
import type { AssistantUIMessage } from "@/features/assistant/types";
import { FakeFlashcardEditChat } from "@/test/fake-flashcard-edit-chat";

const navigation = new Promise<void>(() => {});
const editor = {
  snapshot: () => "Current draft",
  available: () => true,
};

function PendingNavigation(): never {
  throw navigation;
}

function EditorHarness({ transport }: { transport: FakeFlashcardEditChat }) {
  const chat = useChat<AssistantUIMessage>({ transport });
  const [enabled, setEnabled] = useState(true);
  const [snapshot, setSnapshot] = useState("");
  const [, startTransition] = useTransition();
  const edits = useEditProposalLifecycle<string, typeof editor, string>(
    chat,
    "proposeFlashcardEdits",
    {
      enabled,
      skip: async () => {},
      prepare: async () => null,
      describeError: () => "Invalid edits",
    },
  );
  return (
    <>
      <button type="button" onClick={() => edits.register(editor)}>
        Open editor
      </button>
      <button
        type="button"
        onClick={() => startTransition(() => setEnabled(false))}
      >
        Navigate
      </button>
      <button
        type="button"
        onClick={() => setSnapshot(edits.active()?.snapshot() ?? "Unavailable")}
      >
        Read draft
      </button>
      <output>{snapshot}</output>
      {enabled ? null : <PendingNavigation />}
    </>
  );
}

it("keeps the current editor usable while navigation has not committed", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  async function click(label: string) {
    const button = [...container.querySelectorAll("button")].find(
      (candidate) => candidate.textContent === label,
    );
    expect(button).toBeDefined();
    await act(async () => button?.click());
  }
  try {
    await act(async () =>
      root.render(
        <Suspense fallback="Loading">
          <EditorHarness transport={new FakeFlashcardEditChat()} />
        </Suspense>,
      ),
    );
    await click("Open editor");
    await click("Navigate");
    expect(container.textContent).not.toContain("Loading");
    await click("Read draft");
    expect(container.querySelector("output")?.textContent).toBe(
      "Current draft",
    );
  } finally {
    await act(async () => root.unmount());
    container.remove();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false });
  }
});
