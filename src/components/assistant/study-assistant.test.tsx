import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ChatTransport, UIMessageChunk } from "ai";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantLauncherButton } from "@/components/assistant/assistant-launcher-button";
import { AssistantPanel } from "@/components/assistant/assistant-panel";
import { AssistantWorkspaceProvider } from "@/components/assistant/assistant-workspace-provider";
import { StudyAssistant } from "@/components/assistant/study-assistant";
import type { ProposedFlashcard } from "@/features/assistant/tools";
import type { AssistantUIMessage } from "@/features/assistant/types";
import type { RichTextDocument } from "@/lib/editor/document";
import { documentToHtml } from "@/lib/editor/document-html";
import { testDocument } from "@/test/document";
import { FakeReadApiFetch } from "@/test/fake-read-api-fetch";

// Stands in for the Tiptap editor, which needs a real layout engine. While
// `ready` is false it behaves like an editor that has not been created yet.
const fakeTiptapRenderer = vi.hoisted(() => ({ ready: true }));

vi.mock("@/components/shared/tiptap-renderer", () => ({
  TiptapRenderer: ({
    content,
    fallback,
  }: {
    content: RichTextDocument;
    fallback?: ReactNode;
  }) =>
    fakeTiptapRenderer.ready ? (
      <div data-testid="rich-reply">{documentToHtml(content)}</div>
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

type FakeReply =
  | { chunks: UIMessageChunk[] }
  | { text: string }
  | { streaming: true }
  | { errorBody: unknown }
  | { proposal: ProposedFlashcard[] }
  | { searchThenWait: true };

/**
 * In-memory chat backend: answers each request with the next queued reply,
 * a flashcard proposal, or rejects with the queued route error body.
 */
class FakeAssistantChatTransport implements ChatTransport<AssistantUIMessage> {
  readonly requests: SendMessagesOptions[] = [];
  private readonly replies: FakeReply[] = [];

  replyWithChunks(chunks: UIMessageChunk[]): this {
    this.replies.push({ chunks });
    return this;
  }

  replyWith(text: string): this {
    this.replies.push({ text });
    return this;
  }

  streamReply(): this {
    this.replies.push({ streaming: true });
    return this;
  }

  proposeWith(proposal: ProposedFlashcard[]): this {
    this.replies.push({ proposal });
    return this;
  }

  /** Finishes a search, then holds the stream open as if the next step is pending. */
  searchThenWait(): this {
    this.replies.push({ searchThenWait: true });
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
    if ("chunks" in reply) return streamOfChunks(reply.chunks);
    if ("errorBody" in reply) {
      throw new Error(JSON.stringify(reply.errorBody));
    }
    if ("proposal" in reply) {
      return streamOfChunks(proposalChunks(reply.proposal));
    }
    if ("searchThenWait" in reply) {
      return new ReadableStream({
        start(controller) {
          for (const chunk of [
            { type: "start" },
            { type: "start-step" },
            {
              type: "tool-input-available",
              toolCallId: "search-1",
              toolName: "searchLibrary",
              input: { terms: ["derivatives"] },
            },
            {
              type: "tool-output-available",
              toolCallId: "search-1",
              output: { hits: [] },
            },
            { type: "finish-step" },
            { type: "start-step" },
          ] satisfies UIMessageChunk[])
            controller.enqueue(chunk);
          options.abortSignal?.addEventListener(
            "abort",
            () => controller.close(),
            { once: true },
          );
        },
      });
    }
    if ("streaming" in reply) {
      return new ReadableStream({
        start(controller) {
          controller.enqueue({ type: "start" });
          options.abortSignal?.addEventListener(
            "abort",
            () => controller.close(),
            { once: true },
          );
        },
      });
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

  async function renderPanel(transport: FakeAssistantChatTransport) {
    await act(async () => {
      root.render(
        <QueryClientProvider client={new QueryClient()}>
          <AssistantWorkspaceProvider transport={transport}>
            <AssistantPanel onMinimize={() => {}} />
          </AssistantWorkspaceProvider>
        </QueryClientProvider>,
      );
    });
  }

  async function sendMessage(text: string) {
    const textarea = getByLabel<HTMLTextAreaElement>("Message the assistant");
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

  it("typesets numeric math in the user's submitted answer as well as assistant replies", async () => {
    await renderPanel(new FakeAssistantChatTransport().replyWith("Correto."));
    await sendMessage("B) $6$");
    expect(
      [...container.querySelectorAll('[data-testid="rich-reply"]')].some(
        (reply) =>
          reply.textContent ===
          documentToHtml(
            testDocument(
              'B) <span data-type="inline-math" data-latex="6"></span>',
            ),
          ),
      ),
    ).toBe(true);
  });

  it("shows no empty bubble for a reply without text", async () => {
    await renderPanel(new FakeAssistantChatTransport().replyWith(""));

    await sendMessage("What is ATP?");

    expect(container.querySelector('[data-testid="rich-reply"]')).toBeNull();
    expect(container.textContent).not.toContain("Thinking…");
  });

  it("keeps showing Thinking… after a finished search until the reply text arrives", async () => {
    await renderPanel(new FakeAssistantChatTransport().searchThenWait());

    await sendMessage("Find my notes on derivatives");

    expect(container.textContent).toContain("Thinking…");
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

  it("shows clickable choices under the question and prevents duplicate or stale answers", async () => {
    const question = { question: "What is 2 + 3?", options: ["4", "5", "6"] };
    const transport = new FakeAssistantChatTransport()
      .replyWithChunks([
        {
          type: "tool-input-available",
          toolName: "showAnswerChoices",
          toolCallId: "question-1",
          input: question,
        },
        {
          type: "tool-output-available",
          toolCallId: "question-1",
          output: question,
        },
        { type: "finish" },
      ])
      .replyWith("Correto.");
    await renderPanel(transport);
    await sendMessage("Me dê opções");
    expect(container.querySelector("legend")?.textContent).toBe(
      "What is 2 + 3?",
    );
    const option = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "B) 5",
    );
    expect(option).toBeDefined();
    await act(async () => {
      option?.click();
      option?.click();
    });
    expect(transport.requests).toHaveLength(2);
    expect(transport.requests[1]?.messages.at(-1)?.parts).toEqual([
      { type: "text", text: "B) 5" },
    ]);
    expect(option?.disabled).toBe(true);
    expect(option?.getAttribute("aria-pressed")).toBe("true");
    expect(
      [...container.querySelectorAll("button")].find(
        (button) => button.textContent === "A) 4",
      )?.disabled,
    ).toBe(true);
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

  function sentBypass(transport: FakeAssistantChatTransport, index: number) {
    return (transport.requests[index]?.body as { bypassLearning?: boolean })
      ?.bypassLearning;
  }

  function findButton(name: string): HTMLButtonElement | undefined {
    return [...container.querySelectorAll("button")].find(
      (button) => button.textContent === name,
    );
  }

  it("keeps learning support off for the chat until the user turns it back on", async () => {
    const transport = new FakeAssistantChatTransport()
      .replyWith("Here are the cards.")
      .replyWith("Direct answer.")
      .replyWith("Back to teaching.");
    await renderPanel(transport);

    await sendMessage("Explain osmosis");
    expect(container.textContent).not.toContain("Learning support off");
    expect(sentBypass(transport, 0)).toBeUndefined();
    await sendMessage("/bypass make 3 cards");
    expect(transport.requests[1]?.messages.at(-1)?.parts).toEqual([
      { type: "text", text: "make 3 cards" },
    ]);
    expect(sentBypass(transport, 1)).toBe(true);
    expect(container.textContent).toContain("Learning support off");

    await sendMessage("And diffusion?");
    expect(sentBypass(transport, 2)).toBe(true);

    await act(async () => findButton("Turn on")?.click());
    expect(container.textContent).not.toContain("Learning support off");
    await sendMessage("Now osmosis again");
    expect(sentBypass(transport, 3)).toBeUndefined();
  });

  it("spends no reply on /bypass in an empty chat, and New chat clears it", async () => {
    const transport = new FakeAssistantChatTransport().replyWith("Hello.");
    await renderPanel(transport);

    await sendMessage("/bypass");
    expect(transport.requests).toHaveLength(0);
    expect(container.textContent).toContain("Learning support off");

    await sendMessage("Mitosis?");
    expect(sentBypass(transport, 0)).toBe(true);

    await act(async () => {
      getByLabel<HTMLButtonElement>("New chat").click();
    });
    expect(container.textContent).not.toContain("Learning support off");
  });

  it("keeps learning support off when retrying a failed request", async () => {
    const transport = new FakeAssistantChatTransport()
      .failWith({ success: false, errorCode: "assistant.unavailable" })
      .replyWith("Recovered.");
    await renderPanel(transport);

    await sendMessage("/bypass make 3 cards");
    await act(async () => findButton("Retry")?.click());

    expect(transport.requests).toHaveLength(2);
    expect(sentBypass(transport, 1)).toBe(true);
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

  it("runs /new locally and sends the next question without old history", async () => {
    const transport = new FakeAssistantChatTransport()
      .replyWith("Hello.")
      .replyWith("Fresh reply.");
    await renderPanel(transport);
    await sendMessage("Mitosis?");
    await sendMessage("/new");
    expect(transport.requests).toHaveLength(1);
    expect(container.textContent).not.toContain("Mitosis?");
    expect(container.querySelector('[data-testid="rich-reply"]')).toBeNull();
    await sendMessage("Meiosis?");
    expect(transport.requests[1]?.messages).toHaveLength(1);
    expect(container.textContent).toContain("Fresh reply.");
  });

  it("aborts an active reply with /new and clears the controlled composer", async () => {
    const transport = new FakeAssistantChatTransport().streamReply();
    await renderPanel(transport);
    await sendMessage("Mitosis?");
    expect(
      container.querySelector('[aria-label="Stop answer"]'),
    ).not.toBeNull();
    const textarea = getByLabel<HTMLTextAreaElement>("Message the assistant");
    await act(async () => {
      setTextareaValue(textarea, "/new");
    });
    await act(async () => {
      textarea.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    expect(transport.requests).toHaveLength(1);
    expect(transport.requests[0]?.abortSignal?.aborted).toBe(true);
    expect(container.textContent).not.toContain("Mitosis?");
    expect(textarea.value).toBe("");
    expect(document.activeElement).toBe(textarea);
    expect(container.querySelector('[aria-label="Stop answer"]')).toBeNull();
  });

  it("shows the route error and retries the question", async () => {
    const transport = new FakeAssistantChatTransport()
      .failWith({ success: false, errorCode: "limits.aiAssistantPerDay" })
      .replyWith("Back again.");
    await renderPanel(transport);

    await sendMessage("What is ATP?");
    const alert = container.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain(
      "Daily limit reached for the assistant.",
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
            <AssistantLauncherButton />
          </AssistantWorkspaceProvider>
        </QueryClientProvider>,
      );
    });
    act(() => {
      getByLabel<HTMLButtonElement>("Open assistant").click();
    });
    await vi.waitFor(() => {
      expect(container.querySelector('[aria-label="New chat"]')).not.toBeNull();
    });
  }

  it("minimizes from the panel header and returns focus to the launcher", async () => {
    await openStudyAssistant();

    await act(async () => {
      getByLabel<HTMLButtonElement>("Minimize assistant").click();
    });

    const panel = container.querySelector("#study-assistant-panel");
    const launcher = getByLabel<HTMLButtonElement>("Open assistant");
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
      getByLabel<HTMLButtonElement>("Minimize assistant").click();
    });
    await act(async () => {
      getByLabel<HTMLButtonElement>("Open assistant").click();
    });

    const panel = container.querySelector("#study-assistant-panel");
    expect(panel?.classList.contains("hidden")).toBe(false);
    expect(panel?.textContent).toContain("What is ATP?");
  });

  it("opens the panel from the header launcher and keeps it when closed", async () => {
    await act(async () => {
      root.render(
        <QueryClientProvider client={new QueryClient()}>
          <AssistantWorkspaceProvider>
            <StudyAssistant />
            <AssistantLauncherButton />
          </AssistantWorkspaceProvider>
        </QueryClientProvider>,
      );
    });

    act(() => {
      getByLabel<HTMLButtonElement>("Open assistant").click();
    });
    // The frame shows at once, before the lazily loaded chat arrives.
    expect(
      container.querySelector('section[aria-label="Assistant"]'),
    ).not.toBeNull();
    await vi.waitFor(() => {
      expect(container.querySelector('[aria-label="New chat"]')).not.toBeNull();
    });

    await act(async () => {
      getByLabel<HTMLButtonElement>("Minimize assistant").click();
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
