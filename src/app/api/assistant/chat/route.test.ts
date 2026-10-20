import { beforeEach, describe, expect, it, vi } from "vitest";

const getOptionalSessionMock = vi.fn();
const streamAssistantReplyForUserMock = vi.fn();

vi.mock("@/lib/auth/auth", () => ({
  getOptionalSession: getOptionalSessionMock,
}));

vi.mock("@/features/assistant/service", () => ({
  streamAssistantReplyForUser: streamAssistantReplyForUserMock,
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

  it("answers 503 when AI is not configured", async () => {
    streamAssistantReplyForUserMock.mockResolvedValueOnce({
      success: false,
      errorCode: "assistant.notConfigured",
    });

    const response = await postChat(validBody);

    expect(response.status).toBe(503);
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
});
