import type { ChatTransport, UIMessageChunk } from "ai";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantPanel } from "@/components/assistant/assistant-panel";
import { StudyAssistant } from "@/components/assistant/study-assistant";
import type { AssistantUIMessage } from "@/features/assistant/types";

// Stands in for the Tiptap editor, which needs a real layout engine. While
// `ready` is false it behaves like an editor that has not been created yet.
const fakeTiptapRenderer = vi.hoisted(() => ({ ready: true }));

vi.mock("@/components/shared/tiptap-renderer", () => ({
  TiptapRenderer: ({
    content,
    fallback,
  }: {
    content: string;
    fallback?: ReactNode;
  }) =>
    fakeTiptapRenderer.ready ? (
      <div data-testid="rich-reply">{content}</div>
    ) : (
      fallback
    ),
}));

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

type SendMessagesOptions = Parameters<
  ChatTransport<AssistantUIMessage>["sendMessages"]
>[0];

/**
 * In-memory chat backend: answers each request with the next queued reply,
 * or rejects with the queued route error body.
 */
class FakeAssistantChatTransport implements ChatTransport<AssistantUIMessage> {
  readonly requests: SendMessagesOptions[] = [];
  private readonly replies: Array<{ text: string } | { errorBody: unknown }> =
    [];

  replyWith(text: string): this {
    this.replies.push({ text });
    return this;
  }

  failWith(errorBody: unknown): this {
    this.replies.push({ errorBody });
    return this;
  }

  async sendMessages(
    options: SendMessagesOptions,
  ): Promise<ReadableStream<UIMessageChunk>> {
    this.requests.push(options);
    const reply = this.replies.shift() ?? { text: "" };
    if ("errorBody" in reply) {
      throw new Error(JSON.stringify(reply.errorBody));
    }
    return streamOfText(reply.text);
  }

  async reconnectToStream(): Promise<ReadableStream<UIMessageChunk> | null> {
    return null;
  }
}

function streamOfText(text: string): ReadableStream<UIMessageChunk> {
  const chunks: UIMessageChunk[] = [
    { type: "start" },
    { type: "text-start", id: "t1" },
    { type: "text-delta", id: "t1", delta: text },
    { type: "text-end", id: "t1" },
    { type: "finish" },
  ];
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
}

describe("study assistant", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    fakeTiptapRenderer.ready = true;
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  async function renderPanel(transport: FakeAssistantChatTransport) {
    await act(async () => {
      root.render(<AssistantPanel transport={transport} />);
    });
  }

  async function sendMessage(text: string) {
    const textarea = getByLabel<HTMLTextAreaElement>(
      "Message the study assistant",
    );
    await act(async () => {
      setTextareaValue(textarea, text);
    });
    await act(async () => {
      getByLabel<HTMLButtonElement>("Send").click();
    });
  }

  function getByLabel<TElement extends HTMLElement>(label: string): TElement {
    const element = container.querySelector<TElement>(
      `[aria-label="${label}"]`,
    );
    if (!element) throw new Error(`No element labelled "${label}"`);
    return element;
  }

  it("sends the question and shows the completed reply as rich text", async () => {
    const transport = new FakeAssistantChatTransport().replyWith(
      "ATP stores energy.",
    );
    await renderPanel(transport);

    await sendMessage("What is ATP?");

    expect(container.textContent).toContain("What is ATP?");
    expect(
      container.querySelector('[data-testid="rich-reply"]')?.textContent,
    ).toBe("<p>ATP stores energy.</p>");
    expect(transport.requests[0]?.messages.at(-1)?.parts).toEqual([
      { type: "text", text: "What is ATP?" },
    ]);
  });

  it("keeps the finished reply visible until the rich renderer is ready", async () => {
    fakeTiptapRenderer.ready = false;
    await renderPanel(
      new FakeAssistantChatTransport().replyWith("ATP stores energy."),
    );

    await sendMessage("What is ATP?");

    expect(container.querySelector('[data-testid="rich-reply"]')).toBeNull();
    expect(container.textContent).toContain("ATP stores energy.");
  });

  it("shows no empty bubble for a reply without text", async () => {
    await renderPanel(new FakeAssistantChatTransport().replyWith(""));

    await sendMessage("What is ATP?");

    expect(container.querySelector('[data-testid="rich-reply"]')).toBeNull();
    expect(container.textContent).not.toContain("Thinking…");
  });

  it("clears the conversation on New chat", async () => {
    await renderPanel(new FakeAssistantChatTransport().replyWith("Hello."));
    await sendMessage("Hi");

    await act(async () => {
      getByLabel<HTMLButtonElement>("New chat").click();
    });

    expect(container.textContent).not.toContain("Hi");
    expect(container.querySelector('[data-testid="rich-reply"]')).toBeNull();
  });

  it("shows the route error and retries the question", async () => {
    const transport = new FakeAssistantChatTransport()
      .failWith({ success: false, errorCode: "limits.aiAssistantPerDay" })
      .replyWith("Back again.");
    await renderPanel(transport);

    await sendMessage("What is ATP?");
    const alert = container.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain(
      "Daily limit reached for the study assistant.",
    );

    await act(async () => {
      alert?.querySelector("button")?.click();
    });

    expect(transport.requests).toHaveLength(2);
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.textContent).toContain("Back again.");
  });

  it("opens the panel from the floating button and keeps it when closed", async () => {
    await act(async () => {
      root.render(<StudyAssistant />);
    });

    act(() => {
      getByLabel<HTMLButtonElement>("Open study assistant").click();
    });
    // The frame shows at once, before the lazily loaded chat arrives.
    expect(
      container.querySelector('section[aria-label="Study assistant"]'),
    ).not.toBeNull();
    await vi.waitFor(() => {
      expect(container.querySelector('[aria-label="New chat"]')).not.toBeNull();
    });

    await act(async () => {
      getByLabel<HTMLButtonElement>("Close study assistant").click();
    });

    const panel = container.querySelector("#study-assistant-panel");
    expect(panel?.classList.contains("hidden")).toBe(true);
    expect(panel?.querySelector("section")).not.toBeNull();
  });
});

// React tracks the last value it set; going through the native setter makes
// the input event register as a user edit.
function setTextareaValue(textarea: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    "value",
  )?.set;
  setter?.call(textarea, value);
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}
