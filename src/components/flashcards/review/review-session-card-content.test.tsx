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

it("scrolls the start of the answer into view on reveal, like Anki", async () => {
  const scrollIntoView = vi.fn();
  Element.prototype.scrollIntoView = scrollIntoView;
  await renderCard(false);
  expect(scrollIntoView).toHaveBeenLastCalledWith(
    expect.objectContaining({ block: "start" }),
  );
  const cardTop = scrollIntoView.mock.contexts.at(-1) as Element;

  await renderCard(true);

  const answerTop = scrollIntoView.mock.contexts.at(-1) as Element;
  expect(answerTop).not.toBe(cardTop);
  expect(answerTop.textContent).toContain("Back");
  expect(answerTop.textContent).not.toContain("Front");
  Reflect.deleteProperty(Element.prototype, "scrollIntoView");
});

class FakeResizeObserver {
  static latest: FakeResizeObserver | null = null;
  connected = true;
  constructor(readonly onResize: () => void) {
    FakeResizeObserver.latest = this;
  }
  observe() {}
  disconnect() {
    this.connected = false;
  }
  resize() {
    if (this.connected) this.onResize();
  }
}

it("keeps the answer anchored while it renders, until the user scrolls", async () => {
  const scrollIntoView = vi.fn();
  Element.prototype.scrollIntoView = scrollIntoView;
  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  await renderCard(false);
  await renderCard(true);
  const callsAfterReveal = scrollIntoView.mock.calls.length;

  act(() => FakeResizeObserver.latest?.resize());
  expect(scrollIntoView).toHaveBeenCalledTimes(callsAfterReveal + 1);

  window.dispatchEvent(new Event("wheel"));
  act(() => FakeResizeObserver.latest?.resize());
  expect(scrollIntoView).toHaveBeenCalledTimes(callsAfterReveal + 1);

  vi.unstubAllGlobals();
  Reflect.deleteProperty(Element.prototype, "scrollIntoView");
});
