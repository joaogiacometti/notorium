import { beforeEach, describe, expect, it, vi } from "vitest";

const getOptionalSessionMock = vi.fn();
const streamAssistantReplyForUserMock = vi.fn();
const streamSelectionExplanationForUserMock = vi.fn();

vi.mock("@/lib/auth/auth", () => ({
  getOptionalSession: getOptionalSessionMock,
}));

vi.mock("@/features/assistant/service", () => ({
  streamAssistantReplyForUser: streamAssistantReplyForUserMock,
}));

vi.mock("@/features/assistant/selection-explanation", () => ({
  streamSelectionExplanationForUser: streamSelectionExplanationForUserMock,
}));

const validBody = {
  messages: [
    { id: "m1", role: "user", parts: [{ type: "text", text: "What is ATP?" }] },
  ],
};

function buildRequest(body: string): Request {
  return new Request("http://localhost/api/assistant/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

async function postChat(body: unknown): Promise<Response> {
  const { POST } = await import("./route");
  return POST(
    buildRequest(typeof body === "string" ? body : JSON.stringify(body)),
  );
}

describe("POST /api/assistant/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    getOptionalSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    streamAssistantReplyForUserMock.mockResolvedValue({
      success: true,
      response: new Response("stream"),
    });
    streamSelectionExplanationForUserMock.mockResolvedValue({
      success: true,
      response: new Response("explanation stream"),
    });
  });

  it("rejects requests without an approved session", async () => {
    getOptionalSessionMock.mockResolvedValueOnce(null);

    const response = await postChat(validBody);

    expect(response.status).toBe(401);
    expect(streamAssistantReplyForUserMock).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON and invalid chats", async () => {
    const malformed = await postChat("{not json");
    const invalid = await postChat({ messages: [] });

    expect(malformed.status).toBe(400);
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toMatchObject({
      success: false,
      errorCode: "assistant.invalidData",
    });
    expect(streamAssistantReplyForUserMock).not.toHaveBeenCalled();
  });

  it("forwards whether learning support is off", async () => {
    await postChat({ ...validBody, bypassLearning: true });

    expect(streamAssistantReplyForUserMock).toHaveBeenCalledWith(
      expect.objectContaining({ bypassLearning: true }),
    );
  });

  it("streams the reply for the session user", async () => {
    const response = await postChat(validBody);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("stream");
    expect(streamAssistantReplyForUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        messages: validBody.messages,
      }),
    );
  });

  it("forwards the chat id to the assistant", async () => {
    await postChat({ ...validBody, chatId: "chat-1" });

    expect(streamAssistantReplyForUserMock).toHaveBeenCalledWith(
      expect.objectContaining({ chatId: "chat-1" }),
    );
  });

  it("answers 429 when the daily limit is reached", async () => {
    streamAssistantReplyForUserMock.mockResolvedValueOnce({
      success: false,
      errorCode: "limits.aiAssistantPerDay",
    });

    const response = await postChat(validBody);

    expect(response.status).toBe(429);
    expect(await response.json()).toMatchObject({
      success: false,
      errorCode: "limits.aiAssistantPerDay",
    });
  });

  it("hides unexpected failures behind a generic 500", async () => {
    streamAssistantReplyForUserMock.mockRejectedValueOnce(
      new Error("provider secret detail"),
    );

    const response = await postChat(validBody);
    const body = await response.text();

    expect(response.status).toBe(500);
    expect(body).not.toContain("provider secret detail");
  });

  it("streams an isolated selection lookup for the approved session user", async () => {
    const selection = { text: "ARPU", context: "ARPU increased this quarter." };
    const response = await postChat({ intent: "explain-selection", selection });

    expect(await response.text()).toBe("explanation stream");
    expect(streamSelectionExplanationForUserMock).toHaveBeenCalledWith({
      userId: "user-1",
      selection,
      abortSignal: expect.any(AbortSignal),
    });
    expect(streamAssistantReplyForUserMock).not.toHaveBeenCalled();
  });

  it("requires an approved session for selection lookups", async () => {
    getOptionalSessionMock.mockResolvedValueOnce(null);
    const response = await postChat({
      intent: "explain-selection",
      selection: { text: "ARPU", context: "" },
    });
    expect(response.status).toBe(401);
    expect(streamSelectionExplanationForUserMock).not.toHaveBeenCalled();
  });

  it("rejects oversized selections before spending an AI request", async () => {
    const response = await postChat({
      intent: "explain-selection",
      selection: { text: "x".repeat(4001), context: "" },
    });
    expect(response.status).toBe(400);
    expect(streamSelectionExplanationForUserMock).not.toHaveBeenCalled();
  });

  it("forwards an entire multiline passage without truncating it", async () => {
    const selection = {
      text: "A passage describes how a system works and how its components interact.\nAnother line explains the consequences of changing one of those components.",
      context: "Nearby text",
    };
    const response = await postChat({ intent: "explain-selection", selection });
    expect(response.status).toBe(200);
    expect(streamSelectionExplanationForUserMock).toHaveBeenCalledWith(
      expect.objectContaining({ selection }),
    );
  });

  it("rejects lookup requests mixed with chat history instead of falling back to chat", async () => {
    const response = await postChat({
      ...validBody,
      intent: "explain-selection",
      selection: { text: "ARPU", context: "" },
    });
    expect(response.status).toBe(400);
    expect(streamSelectionExplanationForUserMock).not.toHaveBeenCalled();
    expect(streamAssistantReplyForUserMock).not.toHaveBeenCalled();
  });

  it("handles selection lookup limits and provider failures safely", async () => {
    const body = {
      intent: "explain-selection",
      selection: { text: "ARPU", context: "" },
    };
    streamSelectionExplanationForUserMock.mockResolvedValueOnce({
      success: false,
      errorCode: "limits.aiAssistantPerDay",
    });
    expect((await postChat(body)).status).toBe(429);
    streamSelectionExplanationForUserMock.mockRejectedValueOnce(
      new Error("provider secret"),
    );
    const failed = await postChat(body);
    expect(failed.status).toBe(500);
    expect(await failed.text()).not.toContain("provider secret");
  });
});
