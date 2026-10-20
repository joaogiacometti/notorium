import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createAssistantChatTransport,
  readAssistantErrorMessage,
} from "@/components/assistant/assistant-chat-transport";
import type { AssistantUIMessage } from "@/features/assistant/types";
import { LIMITS } from "@/lib/config/limits";

/** Stands in for `fetch`: records request bodies and answers an empty stream. */
class RecordingChatFetch {
  readonly bodies: unknown[] = [];

  install(): this {
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      this.bodies.push(JSON.parse(String(init.body)));
      return new Response("data: [DONE]\n\n", {
        headers: { "Content-Type": "text/event-stream" },
      });
    });
    return this;
  }
}

function textMessage(index: number): AssistantUIMessage {
  return {
    id: `m${index}`,
    role: index % 2 === 0 ? "user" : "assistant",
    parts: [{ type: "text", text: `message ${index}` }],
  };
}

describe("createAssistantChatTransport", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function sendChat(messageCount: number): Promise<AssistantUIMessage[]> {
    const recorder = new RecordingChatFetch().install();
    const messages = Array.from({ length: messageCount }, (_, index) =>
      textMessage(index),
    );

    await createAssistantChatTransport().sendMessages({
      trigger: "submit-message",
      chatId: "chat-1",
      messageId: undefined,
      messages,
      abortSignal: undefined,
    });

    return (recorder.bodies[0] as { messages: AssistantUIMessage[] }).messages;
  }

  it("sends only the newest messages allowed by the route", async () => {
    const sent = await sendChat(LIMITS.assistantMaxMessages + 4);

    expect(sent).toHaveLength(LIMITS.assistantMaxMessages);
    expect(sent.at(-1)?.id).toBe(`m${LIMITS.assistantMaxMessages + 3}`);
  });

  it("starts the trimmed history at a user message", async () => {
    // Trimming 25 alternating messages to 20 would start on a reply.
    const sent = await sendChat(LIMITS.assistantMaxMessages + 5);

    expect(sent[0]?.role).toBe("user");
    expect(sent).toHaveLength(LIMITS.assistantMaxMessages - 1);
  });
});

describe("readAssistantErrorMessage", () => {
  it("resolves the route's error code to its message", () => {
    const error = new Error(
      JSON.stringify({ success: false, errorCode: "limits.aiAssistantPerDay" }),
    );

    expect(readAssistantErrorMessage(error)).toBe(
      "Daily limit reached for the study assistant.",
    );
  });

  it("falls back to the generic message for network errors", () => {
    expect(readAssistantErrorMessage(new Error("Failed to fetch"))).toBe(
      "Something went wrong. Please try again.",
    );
  });
});
