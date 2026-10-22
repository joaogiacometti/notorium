import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ChatTransport, UIMessageChunk } from "ai";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantPanel } from "@/components/assistant/assistant-panel";
import { AssistantWorkspaceProvider } from "@/components/assistant/assistant-workspace-provider";
import { StudyAssistant } from "@/components/assistant/study-assistant";
import type { ProposedFlashcard } from "@/features/assistant/tools";
import type { AssistantUIMessage } from "@/features/assistant/types";
import type { TutoringMode } from "@/features/assistant/validation";
import { FakeReadApiFetch } from "@/test/fake-read-api-fetch";

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

// Records the cookie writes the Hints first toggle would make on the server.
const savedTutoringModes = vi.hoisted((): string[] => []);

vi.mock("@/app/actions/assistant-preferences", () => ({
  setTutoringModePreference: async (mode: string) => {
    savedTutoringModes.push(mode);
  },
}));

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

type SendMessagesOptions = Parameters<
  ChatTransport<AssistantUIMessage>["sendMessages"]
>[0];

type FakeReply =
  | { text: string }
  | { errorBody: unknown }
  | { proposal: ProposedFlashcard[] };

/**
 * In-memory chat backend: answers each request with the next queued reply,
 * a flashcard proposal, or rejects with the queued route error body.
 */
class FakeAssistantChatTransport implements ChatTransport<AssistantUIMessage> {
  readonly requests: SendMessagesOptions[] = [];
  private readonly replies: FakeReply[] = [];

  replyWith(text: string): this {
    this.replies.push({ text });
    return this;
  }

  proposeWith(proposal: ProposedFlashcard[]): this {
    this.replies.push({ proposal });
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
    if ("proposal" in reply) {
      return streamOfChunks(proposalChunks(reply.proposal));
    }
    return streamOfChunks(textChunks(reply.text));
  }

  async reconnectToStream(): Promise<ReadableStream<UIMessageChunk> | null> {
    return null;
  }
}

function textChunks(text: string): UIMessageChunk[] {
  return [
    { type: "start" },
    { type: "text-start", id: "t1" },
    { type: "text-delta", id: "t1", delta: text },
    { type: "text-end", id: "t1" },
    { type: "finish" },
  ];
}

function proposalChunks(proposal: ProposedFlashcard[]): UIMessageChunk[] {
  return [
    { type: "start" },
    {
      type: "tool-input-available",
      toolCallId: "call-1",
      toolName: "proposeFlashcards",
      input: { cards: proposal },
    },
    { type: "finish" },
  ];
}

function streamOfChunks(
  chunks: UIMessageChunk[],
): ReadableStream<UIMessageChunk> {
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
    vi.unstubAllGlobals();
  });

  async function renderPanel(
    transport: FakeAssistantChatTransport,
    initialTutoring?: TutoringMode,
  ) {
    await act(async () => {
      root.render(
        <QueryClientProvider client={new QueryClient()}>
          <AssistantWorkspaceProvider
            transport={transport}
            initialTutoring={initialTutoring}
          >
            <AssistantPanel onMinimize={() => {}} />
          </AssistantWorkspaceProvider>
        </QueryClientProvider>,
      );
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

  it("sends hint-first tutoring by default and direct answers once toggled off", async () => {
    const transport = new FakeAssistantChatTransport()
      .replyWith("What have you tried?")
      .replyWith("x = 3.");
    await renderPanel(transport);
    const toggle = container.querySelector<HTMLButtonElement>(
      "button[aria-pressed]",
    );

    await sendMessage("Solve x + 2 = 5");
    await act(async () => toggle?.click());
    await sendMessage("Just tell me");

    expect(toggle?.getAttribute("aria-pressed")).toBe("false");
    expect(transport.requests[0]?.body).toMatchObject({ tutoring: "hints" });
    expect(transport.requests[1]?.body).toMatchObject({ tutoring: "answers" });
    expect(savedTutoringModes.at(-1)).toBe("answers");
  });

  it("starts from the saved tutoring mode", async () => {
    const transport = new FakeAssistantChatTransport().replyWith("x = 3.");
    await renderPanel(transport, "answers");

    await sendMessage("Solve x + 2 = 5");

    expect(
      container
        .querySelector("button[aria-pressed]")
        ?.getAttribute("aria-pressed"),
    ).toBe("false");
    expect(transport.requests[0]?.body).toMatchObject({ tutoring: "answers" });
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

  it("shows a proposed flashcard and sends its outcome with the next turn", async () => {
    new FakeReadApiFetch()
      .install()
      .replyJson(200, [{ id: "bio", name: "Biology", path: "Biology" }]);
    const transport = new FakeAssistantChatTransport()
      .proposeWith([{ front: "What is ATP?", back: "Energy carrier." }])
      .replyWith("Done.");
    await renderPanel(transport);

    await sendMessage("Make a card about ATP");
    expect(container.textContent).toContain("Energy carrier.");
    await act(async () => {
      [...container.querySelectorAll("button")]
        .find((button) => button.textContent?.includes("Discard"))
        ?.click();
    });
    await sendMessage("Thanks");

    expect(container.textContent).toContain("Discarded:What is ATP?");
    expect(transport.requests[1]?.messages[1]?.parts).toContainEqual(
      expect.objectContaining({
        type: "tool-proposeFlashcards",
        state: "output-available",
        output: { outcomes: ["dismissed"] },
      }),
    );
  });

  it("tells the assistant about cards left open when the next message is sent", async () => {
    new FakeReadApiFetch()
      .install()
      .replyJson(200, [{ id: "bio", name: "Biology", path: "Biology" }]);
    const transport = new FakeAssistantChatTransport()
      .proposeWith([{ front: "What is ATP?", back: "Energy carrier." }])
      .replyWith("Sure.");
    await renderPanel(transport);

    await sendMessage("Make a card about ATP");
    await sendMessage("Use a formula instead");

    expect(container.textContent).toContain("Skipped:What is ATP?");
    expect(transport.requests[1]?.messages[1]?.parts).toContainEqual(
      expect.objectContaining({
        type: "tool-proposeFlashcards",
        state: "output-available",
        output: { outcomes: ["skipped"] },
      }),
    );
  });

  it("clears the conversation on New chat", async () => {
    await renderPanel(new FakeAssistantChatTransport().replyWith("Hello."));
    await sendMessage("Mitosis?");

    await act(async () => {
      getByLabel<HTMLButtonElement>("New chat").click();
    });

    expect(container.textContent).not.toContain("Mitosis?");
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

  async function openStudyAssistant() {
    await act(async () => {
      root.render(
        <QueryClientProvider client={new QueryClient()}>
          <AssistantWorkspaceProvider>
            <StudyAssistant />
          </AssistantWorkspaceProvider>
        </QueryClientProvider>,
      );
    });
    act(() => {
      getByLabel<HTMLButtonElement>("Open study assistant").click();
    });
    await vi.waitFor(() => {
      expect(container.querySelector('[aria-label="New chat"]')).not.toBeNull();
    });
  }

  it("minimizes from the panel header and returns focus to the launcher", async () => {
    await openStudyAssistant();

    await act(async () => {
      getByLabel<HTMLButtonElement>("Minimize study assistant").click();
    });

    const panel = container.querySelector("#study-assistant-panel");
    const launcher = getByLabel<HTMLButtonElement>("Open study assistant");
    expect(panel?.classList.contains("hidden")).toBe(true);
    expect(document.activeElement).toBe(launcher);
  });

  it("keeps the conversation after minimizing and reopening", async () => {
    await openStudyAssistant();
    // The launcher mounts the real transport; a failing route still leaves the
    // sent message in the chat, which is all this test needs.
    vi.stubGlobal("fetch", async () => new Response("", { status: 500 }));
    await sendMessage("What is ATP?");

    await act(async () => {
      getByLabel<HTMLButtonElement>("Minimize study assistant").click();
    });
    await act(async () => {
      getByLabel<HTMLButtonElement>("Open study assistant").click();
    });

    const panel = container.querySelector("#study-assistant-panel");
    expect(panel?.classList.contains("hidden")).toBe(false);
    expect(panel?.textContent).toContain("What is ATP?");
  });

  it("opens the panel from the floating button and keeps it when closed", async () => {
    await act(async () => {
      root.render(
        <QueryClientProvider client={new QueryClient()}>
          <AssistantWorkspaceProvider>
            <StudyAssistant />
          </AssistantWorkspaceProvider>
        </QueryClientProvider>,
      );
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
      getByLabel<HTMLButtonElement>("Minimize study assistant").click();
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
