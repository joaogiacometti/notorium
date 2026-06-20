import { describe, expect, it } from "vitest";
import { askAiAboutTextSchema } from "@/features/library/ask-ai-validation";
import { LIMITS } from "@/lib/config/limits";

describe("askAiAboutTextSchema", () => {
  it("accepts a thread ending in a user question", () => {
    const result = askAiAboutTextSchema.safeParse({
      sourceText: "Mitochondria are the powerhouse of the cell.",
      messages: [
        { role: "user", content: "What does this mean?" },
        { role: "assistant", content: "It explains energy production." },
        { role: "user", content: "Can you give an example?" },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects a thread whose last message is from the assistant", () => {
    const result = askAiAboutTextSchema.safeParse({
      sourceText: "Some passage.",
      messages: [
        { role: "user", content: "Explain this." },
        { role: "assistant", content: "Here is the explanation." },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("rejects an empty source passage", () => {
    const result = askAiAboutTextSchema.safeParse({
      sourceText: "   ",
      messages: [{ role: "user", content: "What is this?" }],
    });

    expect(result.success).toBe(false);
  });

  it("rejects a source passage over the limit", () => {
    const result = askAiAboutTextSchema.safeParse({
      sourceText: "a".repeat(LIMITS.aiAskSourceMax + 1),
      messages: [{ role: "user", content: "What is this?" }],
    });

    expect(result.success).toBe(false);
  });

  it("rejects a thread exceeding the message count limit", () => {
    const messages = Array.from(
      { length: LIMITS.aiAskMaxMessages + 1 },
      () => ({ role: "user" as const, content: "Question?" }),
    );
    const result = askAiAboutTextSchema.safeParse({
      sourceText: "Passage.",
      messages,
    });

    expect(result.success).toBe(false);
  });
});
