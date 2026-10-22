import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import { useAssistantWorkspace } from "@/components/assistant/assistant-workspace-context";
import { AssistantWorkspaceProvider } from "@/components/assistant/assistant-workspace-provider";
import { useStudyContext } from "@/components/assistant/use-study-context";
import { FakeFlashcardEditChat } from "@/test/fake-flashcard-edit-chat";

function StudySurface({ review = false }: { review?: boolean }) {
  const [revealed, setRevealed] = useState(false);
  useStudyContext(
    review
      ? {
          kind: "review",
          mode: "review",
          front: "Question",
          ...(revealed ? { back: "Answer" } : {}),
        }
      : { kind: "note", title: "Note", content: "Unsaved", partial: false },
  );
  return (
    <button type="button" onClick={() => setRevealed(true)}>
      Reveal
    </button>
  );
}
function ContextHarness() {
  const workspace = useAssistantWorkspace();
  const [review, setReview] = useState(false);
  return (
    <>
      <StudySurface />
      {review ? <StudySurface review /> : null}
      <button type="button" onClick={() => setReview(!review)}>
        Toggle
      </button>
      <button
        type="button"
        onClick={() => void workspace?.send("Explain this")}
      >
        Send
      </button>
      <output>{JSON.stringify(workspace?.context)}</output>
    </>
  );
}
it("refreshes visible card context and restores the underlying note on exit", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const container = document.createElement("div");
  const root = createRoot(container);
  const transport = new FakeFlashcardEditChat();
  try {
    await act(async () =>
      root.render(
        <AssistantWorkspaceProvider transport={transport}>
          <ContextHarness />
        </AssistantWorkspaceProvider>,
      ),
    );
    expect(container.querySelector("output")?.textContent).toContain("Unsaved");
    await act(async () => container.querySelectorAll("button")[1].click());
    expect(container.querySelector("output")?.textContent).not.toContain(
      "Answer",
    );
    await act(async () => container.querySelectorAll("button")[3].click());
    expect(transport.requests.at(-1)?.body).toEqual({
      tutoring: "hints",
      context: { kind: "review", mode: "review", front: "Question" },
    });
    await act(async () => container.querySelectorAll("button")[1].click());
    expect(container.querySelector("output")?.textContent).toContain("Answer");
    await act(async () => container.querySelectorAll("button")[3].click());
    expect(transport.requests.at(-1)?.body).toEqual({
      tutoring: "hints",
      context: {
        kind: "review",
        mode: "review",
        front: "Question",
        back: "Answer",
      },
    });
    await act(async () => container.querySelectorAll("button")[2].click());
    expect(container.querySelector("output")?.textContent).toContain("Unsaved");
    await act(async () => container.querySelectorAll("button")[2].click());
    expect(transport.requests.at(-1)?.body).toEqual({
      tutoring: "hints",
      context: {
        kind: "note",
        title: "Note",
        content: "Unsaved",
        partial: false,
      },
    });
  } finally {
    await act(async () => root.unmount());
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false });
  }
});
