import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useAssistantWorkspace } from "@/components/assistant/assistant-workspace-context";
import { AssistantWorkspaceProvider } from "@/components/assistant/assistant-workspace-provider";
import { makeCard } from "@/components/flashcards/review/flashcard-review-client-test-support";
import { ReviewSessionCardContent } from "@/components/flashcards/review/review-session-card-content";
import { FakeFlashcardEditChat } from "@/test/fake-flashcard-edit-chat";

vi.mock("@/components/shared/lazy-tiptap-renderer", () => ({
  LazyTiptapRenderer: ({ content }: { content: string }) => (
    <div>{content}</div>
  ),
}));

const ASSISTED_NOTE = "If it helped you recall, grade Hard or Again.";

let container: HTMLDivElement;
let root: Root;

function AskButton() {
  const workspace = useAssistantWorkspace();
  return (
    <button type="button" onClick={() => void workspace?.send("Hint?")}>
      Ask
    </button>
  );
}

async function renderCard(
  revealed: boolean,
  cardId = "card-1",
  mode: "review" | "exam" = "review",
) {
  await act(async () =>
    root.render(
      <AssistantWorkspaceProvider transport={new FakeFlashcardEditChat()}>
        <ReviewSessionCardContent
          card={makeCard(cardId)}
          subjectLabel="Biology"
          revealed={revealed}
          mode={mode}
        />
        <AskButton />
      </AssistantWorkspaceProvider>,
    ),
  );
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  container = document.createElement("div");
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false });
});

it("suggests a lower grade after asking the assistant before reveal", async () => {
  await renderCard(false);
  await act(async () => container.querySelector("button")?.click());
  expect(container.textContent).not.toContain(ASSISTED_NOTE);

  await renderCard(true);

  expect(container.textContent).toContain(ASSISTED_NOTE);
});

it("shows no grading note when the answer was recalled unaided", async () => {
  await renderCard(true);
  await act(async () => container.querySelector("button")?.click());

  expect(container.textContent).not.toContain(ASSISTED_NOTE);
});

it.each(["review", "exam"] as const)(
  "clears assisted recall when the same card starts another %s attempt",
  async (mode) => {
    await renderCard(false, "card-1", mode);
    await act(async () => container.querySelector("button")?.click());
    await renderCard(true, "card-1", mode);
    expect(container.textContent).toContain(ASSISTED_NOTE);

    await renderCard(false, "card-1", mode);
    await renderCard(true, "card-1", mode);
    expect(container.textContent).not.toContain(ASSISTED_NOTE);
  },
);

it("does not carry assistance through another card and back", async () => {
  await renderCard(false);
  await act(async () => container.querySelector("button")?.click());
  await renderCard(true);
  await renderCard(false, "card-2");
  await renderCard(false);
  await renderCard(true);
  expect(container.textContent).not.toContain(ASSISTED_NOTE);
});

it("records fresh assistance on a repeated attempt", async () => {
  await renderCard(false);
  await act(async () => container.querySelector("button")?.click());
  await renderCard(true);
  await renderCard(false);
  await act(async () => container.querySelector("button")?.click());
  await renderCard(true);
  expect(container.textContent).toContain(ASSISTED_NOTE);
});

it("clears assistance when switching cards while the answer stays hidden", async () => {
  await renderCard(false);
  await act(async () => container.querySelector("button")?.click());
  await renderCard(false, "card-2");
  await renderCard(true);
  expect(container.textContent).not.toContain(ASSISTED_NOTE);
});
