import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  LibrarySearchInput,
  LibrarySearchOutput,
} from "@/features/assistant/library-search-contract";
import { assistantChatRequestSchema } from "@/features/assistant/validation";
import {
  FLASHCARD_ANSWER_RULES,
  FLASHCARD_EXAMPLE_RULES,
} from "@/features/flashcards/ai-prompts";
import { OUTPUT_LANGUAGE_RULE } from "@/lib/ai/prompt-rules";
import { FakeDailyRateLimiter } from "@/test/fake-daily-rate-limiter";
import {
  createFakeStreamingModel,
  createFakeToolThenTextModel,
  readStreamedText,
} from "@/test/fake-streaming-model";

/** Folder store standing in for the DB; records whose folders were read. */
class FakeFolderPathStore {
  readonly requestedUserIds: string[] = [];

  constructor(private readonly paths: string[]) {}

  load = async (userId: string): Promise<string[]> => {
    this.requestedUserIds.push(userId);
    return this.paths;
  };
}

/** Library search standing in for the DB; records each user's search. */
class FakeLibrarySearch {
  readonly calls: Array<{ userId: string; input: LibrarySearchInput }> = [];

  constructor(
    private readonly output: LibrarySearchOutput | Error = { hits: [] },
  ) {}

  search = async (
    userId: string,
    input: LibrarySearchInput,
  ): Promise<LibrarySearchOutput> => {
    this.calls.push({ userId, input });
    if (this.output instanceof Error) throw this.output;
    return this.output;
  };
}

const resolveAiSettingsMock = vi.fn();
const getAiModelMock = vi.fn();
const limiter = vi.hoisted(() => ({
  current: null as FakeDailyRateLimiter | null,
}));

vi.mock("@/lib/ai/config", () => ({
  resolveAiSettings: resolveAiSettingsMock,
}));

vi.mock("@/lib/ai/provider", () => ({
  getAiModel: getAiModelMock,
}));

vi.mock("@/lib/rate-limit/user-rate-limit", () => ({
  consumeUserDailyRateLimit: (
    options: Parameters<FakeDailyRateLimiter["consume"]>[0],
  ) => limiter.current?.consume(options),
}));

const messages = [
  {
    id: "m1",
    role: "user" as const,
    parts: [{ type: "text" as const, text: "What is ATP?" }],
  },
];

describe("streamAssistantReplyForUser", () => {
  beforeEach(() => {
    limiter.current = new FakeDailyRateLimiter();
    resolveAiSettingsMock.mockReset().mockReturnValue({
      model: "test/model",
      apiKey: "sk-or-v1-test",
      reasoningEffort: "none",
    });
  });

  it("streams the reply under the assistant daily limit", async () => {
    getAiModelMock.mockReturnValue(
      createFakeStreamingModel("ATP stores energy."),
    );
    const { streamAssistantReplyForUser } = await import(
      "@/features/assistant/service"
    );

    const result = await streamAssistantReplyForUser({
      userId: "user-1",
      messages,
      loadFolderPaths: new FakeFolderPathStore([]).load,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(readStreamedText(await result.response.text())).toBe(
      "ATP stores energy.",
    );
    expect(limiter.current?.calls[0]?.prefix).toBe("ratelimit:ai:assistant");
  });

  it("returns the daily limit error without calling the model", async () => {
    vi.spyOn(
      limiter.current as FakeDailyRateLimiter,
      "consume",
    ).mockResolvedValue({
      limited: true,
      errorCode: "limits.aiAssistantPerDay",
      remaining: 0,
      resetAt: "2026-01-02T00:00:00.000Z",
    });
    const { streamAssistantReplyForUser } = await import(
      "@/features/assistant/service"
    );

    const result = await streamAssistantReplyForUser({
      userId: "user-1",
      messages,
    });

    expect(result).toEqual({
      success: false,
      errorCode: "limits.aiAssistantPerDay",
    });
    expect(getAiModelMock).not.toHaveBeenCalled();
  });

  it("offers the flashcard tool and the user's folder paths", async () => {
    const model = createFakeStreamingModel("Here is a card.");
    getAiModelMock.mockReturnValue(model);
    const folders = new FakeFolderPathStore(["Biology::Cells"]);
    const { streamAssistantReplyForUser } = await import(
      "@/features/assistant/service"
    );

    const result = await streamAssistantReplyForUser({
      userId: "user-1",
      messages,
      loadFolderPaths: folders.load,
    });
    if (result.success) await result.response.text();

    const call = model.doStreamCalls[0];
    expect(folders.requestedUserIds).toEqual(["user-1"]);
    expect(call?.tools?.map((tool) => tool.name)).toEqual([
      "proposeFlashcards",
      "searchLibrary",
      "showAnswerChoices",
    ]);
    expect(JSON.stringify(call?.prompt[0])).not.toContain("Biology::Cells");
    expect(JSON.stringify(call?.prompt.at(-1))).toContain("Biology::Cells");
  });

  it.each([true, false])(
    "reports learning support and answer choices when bypass=%s",
    async (bypassLearning) => {
      const model = createFakeStreamingModel("A direct answer.");
      getAiModelMock.mockReturnValue(model);
      const { streamAssistantReplyForUser } = await import(
        "@/features/assistant/service"
      );

      const result = await streamAssistantReplyForUser({
        userId: "user-1",
        messages: [
          {
            id: "u1",
            role: "user",
            parts: [{ type: "text", text: "How does osmosis work?" }],
          },
          {
            id: "a1",
            role: "assistant",
            parts: [{ type: "text", text: "Water moves across a membrane." }],
          },
          {
            id: "u2",
            role: "user",
            parts: [{ type: "text", text: "Give me options" }],
          },
        ],
        bypassLearning,
        loadFolderPaths: new FakeFolderPathStore([]).load,
      });
      if (result.success) await result.response.text();

      const call = model.doStreamCalls[0];
      expect(
        call?.tools?.some((tool) => tool.name === "showAnswerChoices"),
      ).toBe(!bypassLearning);
      expect(
        JSON.stringify(call?.prompt.at(-1)).includes("<learning_support>"),
      ).toBe(bypassLearning);
    },
  );

  it("displays choices without another model call that could reveal the answer", async () => {
    const question = { question: "What is 2 + 3?", options: ["4", "5", "6"] };
    const model = createFakeToolThenTextModel(
      "showAnswerChoices",
      question,
      "This must not be generated.",
    );
    getAiModelMock.mockReturnValue(model);
    const { streamAssistantReplyForUser } = await import(
      "@/features/assistant/service"
    );
    const result = await streamAssistantReplyForUser({
      userId: "user-1",
      messages: [
        {
          id: "u1",
          role: "user",
          parts: [{ type: "text", text: "How does osmosis work?" }],
        },
        {
          id: "a1",
          role: "assistant",
          parts: [{ type: "text", text: "Water moves across a membrane." }],
        },
        {
          id: "u2",
          role: "user",
          parts: [{ type: "text", text: "Give me options" }],
        },
      ],
      loadFolderPaths: new FakeFolderPathStore([]).load,
    });
    if (!result.success) throw new Error("Expected a streamed reply");
    const body = await result.response.text();
    expect(body).toContain('"options":["4","5","6"]');
    expect(model.doStreamCalls).toHaveLength(1);
    expect(readStreamedText(body)).toBe("");
  });

  it("searches the user's library, then answers from the hits", async () => {
    const model = createFakeToolThenTextModel(
      "searchLibrary",
      { terms: ["mitose", "mitosis"] },
      "Yes, one flashcard.",
    );
    getAiModelMock.mockReturnValue(model);
    const library = new FakeLibrarySearch({
      hits: [
        {
          kind: "flashcard",
          id: "card-1",
          folderId: "folder-1",
          title: "What is mitosis?",
          folderPath: "Biology",
          snippet: "Cell division.",
        },
      ],
    });
    const { streamAssistantReplyForUser } = await import(
      "@/features/assistant/service"
    );

    const result = await streamAssistantReplyForUser({
      userId: "user-1",
      messages,
      loadFolderPaths: new FakeFolderPathStore([]).load,
      searchLibrary: library.search,
    });
    if (!result.success) throw new Error("Expected a streamed reply");
    const body = await result.response.text();

    const answerCall = model.doStreamCalls[1];
    expect(library.calls).toEqual([
      { userId: "user-1", input: { terms: ["mitose", "mitosis"] } },
    ]);
    expect(readStreamedText(body)).toBe("Yes, one flashcard.");
    expect(JSON.stringify(answerCall?.prompt)).toContain("What is mitosis?");
    expect(JSON.stringify(answerCall?.prompt)).not.toContain("card-1");
    expect(answerCall?.tools?.map((tool) => tool.name)).not.toContain(
      "searchLibrary",
    );
    expect(model.doStreamCalls).toHaveLength(2);
  });

  it("sends global language and card policies once without promoting source content", async () => {
    const model = createFakeStreamingModel("A proposed card.");
    getAiModelMock.mockReturnValue(model);
    const { streamAssistantReplyForUser } = await import(
      "@/features/assistant/service"
    );
    const result = await streamAssistantReplyForUser({
      userId: "user-1",
      messages,
      draft: {
        sessionId: "language-test",
        revision: 0,
        front: "O que é ATP?",
        back: "Transporta energia.",
      },
      loadFolderPaths: new FakeFolderPathStore(["Biologia"]).load,
    });
    if (!result.success) throw new Error("Expected a streamed reply");
    await result.response.text();

    const call = model.doStreamCalls[0];
    for (const rule of [
      OUTPUT_LANGUAGE_RULE,
      FLASHCARD_ANSWER_RULES,
      FLASHCARD_EXAMPLE_RULES,
    ]) {
      expect(call.prompt[0]).toMatchObject({
        role: "system",
        content: expect.stringContaining(rule),
      });
      const encodedRule = JSON.stringify(rule).slice(1, -1);
      expect(JSON.stringify(call).split(encodedRule)).toHaveLength(2);
      expect(JSON.stringify(call.tools)).not.toContain(encodedRule);
    }
    expect(JSON.stringify(call.prompt[0])).not.toContain("Transporta energia");
    expect(JSON.stringify(call.prompt.at(-1))).toContain("Transporta energia");
  });

  it("hides a failed search's internal error from the model", async () => {
    const model = createFakeToolThenTextModel(
      "searchLibrary",
      { terms: ["mitose"] },
      "The search failed.",
    );
    getAiModelMock.mockReturnValue(model);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const library = new FakeLibrarySearch(
      new Error('relation "secret_table_x" does not exist'),
    );
    const { streamAssistantReplyForUser } = await import(
      "@/features/assistant/service"
    );

    const result = await streamAssistantReplyForUser({
      userId: "user-1",
      messages,
      loadFolderPaths: new FakeFolderPathStore([]).load,
      searchLibrary: library.search,
    });
    if (!result.success) throw new Error("Expected a streamed reply");
    const body = await result.response.text();

    const answerPrompt = JSON.stringify(model.doStreamCalls[1]?.prompt);
    expect(answerPrompt).toContain("Library search is unavailable right now.");
    expect(answerPrompt).not.toContain("secret_table_x");
    expect(body).not.toContain("secret_table_x");
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('"scope":"assistant.searchLibrary"'),
    );
    errorSpy.mockRestore();
  });

  it("places study context before the question without adding it to system instructions", async () => {
    const model = createFakeStreamingModel("A hint.");
    getAiModelMock.mockReturnValue(model);
    const { streamAssistantReplyForUser } = await import(
      "@/features/assistant/service"
    );
    const result = await streamAssistantReplyForUser({
      userId: "user-1",
      messages,
      context: {
        kind: "review",
        mode: "exam",
        front: "Current visible question",
      },
      loadFolderPaths: new FakeFolderPathStore([]).load,
    });
    if (result.success) await result.response.text();
    const prompt = model.doStreamCalls[0].prompt;
    expect(JSON.stringify(prompt[0])).not.toContain("Current visible question");
    const latest = JSON.stringify(prompt.at(-1));
    expect(latest.indexOf("Current visible question")).toBeLessThan(
      latest.indexOf("What is ATP?"),
    );
    expect(latest).not.toContain('"back"');
  });

  it("keeps a skipped card and its correction in history when the review card changes", async () => {
    const model = createFakeStreamingModel("A revised card.");
    getAiModelMock.mockReturnValue(model);
    const card = {
      front: "What does evaporation do?",
      back: "Changes liquid into gas.",
    };
    const request = assistantChatRequestSchema.parse({
      messages: [
        {
          id: "u1",
          role: "user",
          parts: [
            { type: "text", text: "Create one flashcard about evaporation." },
          ],
        },
        {
          id: "a1",
          role: "assistant",
          parts: [
            {
              type: "tool-proposeFlashcards",
              toolCallId: "proposal-1",
              state: "output-available",
              input: { cards: [card] },
              output: { outcomes: ["skipped"] },
            },
          ],
        },
        {
          id: "u2",
          role: "user",
          parts: [
            {
              type: "text",
              text: "Inverse: put drying clothes on the front and ask which process it shows.",
            },
          ],
        },
        {
          id: "a2",
          role: "assistant",
          parts: [{ type: "text", text: "Would you like me to update it?" }],
        },
        { id: "u3", role: "user", parts: [{ type: "text", text: "do it" }] },
      ],
      context: {
        kind: "review",
        mode: "review",
        front: "What is a prime number?",
        hiddenBack: "A whole number above one with exactly two factors.",
      },
    });
    const { streamAssistantReplyForUser } = await import(
      "@/features/assistant/service"
    );
    const result = await streamAssistantReplyForUser({
      ...request,
      userId: "user-1",
      loadFolderPaths: new FakeFolderPathStore([]).load,
    });
    if (!result.success) throw new Error("Expected a streamed reply");
    await result.response.text();

    const prompt = model.doStreamCalls[0].prompt;
    expect(prompt.map((turn) => turn.role)).toEqual([
      "system",
      "user",
      "assistant",
      "tool",
      "user",
      "assistant",
      "user",
    ]);
    expect(prompt[2]).toMatchObject({
      content: [
        {
          type: "tool-call",
          toolCallId: "proposal-1",
          input: { cards: [card] },
        },
      ],
    });
    expect(JSON.stringify(prompt[3])).toContain("skipped");
    expect(JSON.stringify(prompt[4])).toContain("drying clothes");
    expect(JSON.stringify(prompt.slice(0, -1))).not.toContain("prime number");
    expect(prompt.at(-1)?.content.at(-2)).toEqual({
      type: "text",
      text: "<user_request>\ndo it\n</user_request>",
    });
  });

  it("sends document drafts after history while keeping instructions and tools stable", async () => {
    const model = createFakeStreamingModel("A proposed change.");
    getAiModelMock.mockReturnValue(model);
    const { streamAssistantReplyForUser } = await import(
      "@/features/assistant/service"
    );
    for (const markdown of ["Original note", "Updated note"]) {
      const result = await streamAssistantReplyForUser({
        userId: "user-1",
        messages,
        documentDraft: {
          kind: "note",
          sessionId: "s",
          revision: 0,
          title: "Title",
          partial: true,
          blocks: [{ id: "b0", markdown }],
        },
        loadFolderPaths: new FakeFolderPathStore([]).load,
      });
      if (result.success) await result.response.text();
    }
    const [first, second] = model.doStreamCalls;
    expect(first.prompt[0]).toEqual(second.prompt[0]);
    expect(first.tools).toEqual(second.tools);
    const latest = JSON.stringify(second.prompt.at(-1));
    expect(latest).toContain("Updated note");
    expect(latest.indexOf("Updated note")).toBeLessThan(
      latest.indexOf("What is ATP?"),
    );
    expect(JSON.stringify(second.prompt.slice(0, -1))).not.toContain(
      "Updated note",
    );
  });

  it("appends draft context after history without changing system instructions", async () => {
    const model = createFakeStreamingModel("Review changes in the editor.");
    getAiModelMock.mockReturnValue(model);
    const { streamAssistantReplyForUser } = await import(
      "@/features/assistant/service"
    );
    for (const back of ["First draft", "Second draft"]) {
      const result = await streamAssistantReplyForUser({
        userId: "user-1",
        messages,
        draft: { sessionId: "d", revision: 0, front: "Question", back },
        loadFolderPaths: new FakeFolderPathStore([]).load,
      });
      if (result.success) await result.response.text();
    }
    const [first, second] = model.doStreamCalls;
    expect(first.prompt[0]).toEqual(second.prompt[0]);
    expect(first.tools).toEqual(second.tools);
    expect(JSON.stringify(first.prompt.at(-1))).toContain("First draft");
    expect(JSON.stringify(second.prompt.at(-1))).toContain("Second draft");
    expect(JSON.stringify(first.prompt.slice(0, -1))).not.toContain(
      "First draft",
    );
  });

  it("keeps the user's question after the draft background, tagged as the request", async () => {
    const model = createFakeStreamingModel(
      "Alpha squared means alpha multiplied by itself.",
    );
    getAiModelMock.mockReturnValue(model);
    const { streamAssistantReplyForUser } = await import(
      "@/features/assistant/service"
    );
    const question = "what is alpha^2?";
    const result = await streamAssistantReplyForUser({
      userId: "user-1",
      messages: [
        {
          id: "question",
          role: "user",
          parts: [{ type: "text", text: question }],
        },
      ],
      draft: {
        sessionId: "d",
        revision: 0,
        front: "Explain alpha",
        back: "",
      },
      loadFolderPaths: new FakeFolderPathStore([]).load,
    });
    if (result.success) await result.response.text();
    const finalTurn = model.doStreamCalls[0].prompt.at(-1);
    expect(finalTurn?.role).toBe("user");
    expect(finalTurn?.content.at(-2)).toEqual({
      type: "text",
      text: `<user_request>\n${question}\n</user_request>`,
    });
    expect(JSON.stringify(finalTurn?.content.slice(0, -2))).toContain(
      "Explain alpha",
    );
  });

  it("preserves old editor tool results after the editor closes", async () => {
    const model = createFakeStreamingModel(
      "The note suggestion was discarded.",
    );
    getAiModelMock.mockReturnValue(model);
    const request = assistantChatRequestSchema.parse({
      messages: [
        {
          id: "a",
          role: "assistant",
          parts: [
            {
              type: "tool-proposeNoteEdits",
              toolCallId: "old-note",
              state: "output-available",
              input: {
                sessionId: "note-session",
                revision: 2,
                replacements: [
                  {
                    firstBlockId: "block-1",
                    lastBlockId: "block-1",
                    markdown: "Updated content",
                  },
                ],
              },
              output: { outcome: "discarded" },
            },
          ],
        },
        {
          id: "u",
          role: "user",
          parts: [{ type: "text", text: "What happened to that suggestion?" }],
        },
      ],
    });
    const { streamAssistantReplyForUser } = await import(
      "@/features/assistant/service"
    );
    const result = await streamAssistantReplyForUser({
      ...request,
      userId: "user-1",
      loadFolderPaths: new FakeFolderPathStore([]).load,
    });
    if (result.success) await result.response.text();
    const call = model.doStreamCalls[0];
    expect(call.tools?.map((tool) => tool.name)).toEqual([
      "proposeFlashcards",
      "searchLibrary",
      "showAnswerChoices",
    ]);
    expect(call.prompt).toContainEqual(
      expect.objectContaining({
        role: "tool",
        content: [
          expect.objectContaining({
            toolCallId: "old-note",
            toolName: "proposeNoteEdits",
            output: { type: "json", value: { outcome: "discarded" } },
          }),
        ],
      }),
    );
  });

  it("routes by chat id", async () => {
    const model = createFakeStreamingModel("ATP stores energy.");
    getAiModelMock.mockReturnValue(model);
    const { streamAssistantReplyForUser } = await import(
      "@/features/assistant/service"
    );

    const result = await streamAssistantReplyForUser({
      userId: "user-1",
      messages,
      chatId: "chat-1",
      loadFolderPaths: new FakeFolderPathStore([]).load,
    });
    if (result.success) await result.response.text();

    expect(model.doStreamCalls[0]?.providerOptions?.openrouter).toEqual({
      session_id: "chat-1",
    });
  });
});
