import { describe, expect, it } from "vitest";
import { readRequestedLessonSummary } from "@/features/assistant/lesson-summary";
import { assistantChatRequestSchema } from "@/features/assistant/validation";

function conversation(endedByUser: boolean, markerId = "lesson") {
  return assistantChatRequestSchema.parse({
    messages: [
      {
        id: "unrelated",
        role: "user",
        parts: [{ type: "text", text: "An unrelated question" }],
      },
      {
        id: "old",
        role: "assistant",
        parts: [{ type: "text", text: "An earlier answer." }],
      },
      {
        id: "start",
        role: "user",
        parts: [{ type: "text", text: "/learn Topic" }],
      },
      {
        id: "lesson",
        role: "assistant",
        parts: [
          {
            type: "tool-startGuidedLesson",
            toolCallId: "lesson",
            state: "output-available",
            input: { topic: "Topic" },
            output: { topic: "Topic", endedByUser },
          },
        ],
      },
      {
        id: "attempt",
        role: "user",
        parts: [{ type: "text", text: "I need help" }],
      },
      {
        id: "explanation",
        role: "assistant",
        parts: [{ type: "text", text: "An explanation." }],
      },
      {
        id: "close",
        role: "user",
        metadata: { lessonSummary: markerId },
        parts: [{ type: "text", text: "Summary" }],
      },
    ],
  }).messages;
}

describe("readRequestedLessonSummary", () => {
  it("scopes the requested summary to the ended lesson, retaining attempts and assistance", () => {
    const result = readRequestedLessonSummary(conversation(true));
    expect(result?.topic).toBe("Topic");
    expect(result?.messages.map((message) => message.id)).toEqual([
      "start",
      "lesson",
      "attempt",
      "explanation",
      "close",
    ]);
  });
  it("does not treat a plain summary request as lesson exit", () => {
    expect(readRequestedLessonSummary(conversation(false))).toBeNull();
  });
  it("rejects missing or unrelated lesson references", () => {
    expect(
      readRequestedLessonSummary(conversation(true, "missing")),
    ).toBeNull();
    expect(
      readRequestedLessonSummary(conversation(true).slice(0, -1)),
    ).toBeNull();
  });
});
