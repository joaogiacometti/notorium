// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  buildDocumentContext,
  buildReviewContext,
  describeMindmapGraph,
} from "@/components/assistant/study-context-content";
import {
  describeStudyContext,
  studyContextSchema,
} from "@/features/assistant/study-context";
import { assistantChatRequestSchema } from "@/features/assistant/validation";

describe("study context snapshots", () => {
  it("preserves note structure and math without attachment URLs", () => {
    const context = buildDocumentContext(
      "note",
      "Variance",
      "Stats",
      '<p>Variance</p><ul><li>Spread</li></ul><span data-type="inline-math" data-latex="x^2"></span><img src="https://private/image">',
    );
    expect(context.content).toContain("x^2");
    expect(context.content).toMatch(/-\s+Spread/);
    expect(context.content).toContain("{{IMAGE_0}}");
    expect(context.content).not.toContain("https://private");
    expect(context.partial).toBe(false);
  });
  it("hides image URLs that the renderer recognizes in standalone paragraphs", () => {
    const html = "<p>Look at this:</p><p>https://example.com/figure.png</p>";
    const note = buildDocumentContext("note", "Figure", "", html);
    const card = buildReviewContext(
      { front: html, back: "Answer" },
      "",
      false,
      "review",
    );
    expect(note.content).not.toContain("https://example.com");
    expect(card.front).not.toContain("https://example.com");
    expect(note.content).toContain("{{IMAGE_0}}");
  });
  it("caps documents and advertises partial context", () => {
    const context = buildDocumentContext("note", "Long", "", "x".repeat(12001));
    expect(context.content).toHaveLength(12000);
    expect(describeStudyContext(context)).toContain("partial context");
    expect(
      studyContextSchema.safeParse({ ...context, content: "x".repeat(12001) })
        .success,
    ).toBe(false);
  });
  it("orders graph nodes from the root and preserves labeled relationships without image metadata", () => {
    const context = describeMindmapGraph({
      nodes: [
        {
          id: "b",
          position: { x: 10, y: 20 },
          data: { label: "Branch", imageUrl: "https://private/image" },
        },
        {
          id: "r",
          position: { x: 0, y: 0 },
          data: { label: "Root", kind: "root" },
        },
      ],
      edges: [
        { id: "e", source: "r", target: "b", label: "includes" },
        { id: "cycle", source: "b", target: "r" },
      ],
    });
    expect(context).toBe("r: Root\nb: Branch\nr -> b (includes)\nb -> r");
  });
  it("preserves connection directions including connections without arrows", () => {
    const content = describeMindmapGraph({
      nodes: [],
      edges: [
        { id: "a", source: "A", target: "B", direction: "backward" },
        { id: "b", source: "B", target: "C", direction: "both" },
        { id: "c", source: "C", target: "D", direction: "none" },
      ],
    });
    expect(content).toBe("A <- B\nB <-> C\nC -- D");
  });
  it("marks an unrevealed answer hidden and updates card content and mode", () => {
    const card = {
      front: '<p>Question</p><img src="https://private/image">',
      back: "Hidden answer",
    };
    expect(buildReviewContext(card, "Math", false, "review")).toMatchObject({
      hiddenBack: "Hidden answer",
    });
    expect(
      buildReviewContext(card, "Math", false, "review"),
    ).not.toHaveProperty("back");
    expect(
      JSON.stringify(buildReviewContext(card, "Math", false, "review")),
    ).not.toContain("https://private");
    expect(buildReviewContext(card, "Math", true, "exam")).toMatchObject({
      mode: "exam",
      back: "Hidden answer",
    });
    expect(buildReviewContext(card, "Math", true, "exam")).not.toHaveProperty(
      "hiddenBack",
    );
    expect(
      buildReviewContext(
        { front: "Next", back: "Next answer" },
        "Math",
        false,
        "review",
      ),
    ).toMatchObject({ front: "Next" });
  });
  it("distinguishes hidden and revealed answers", () => {
    expect(
      describeStudyContext({ kind: "review", mode: "exam", front: "Q" }),
    ).toContain("exam card · answer hidden");
    expect(
      describeStudyContext({
        kind: "review",
        mode: "review",
        front: "Q",
        back: "A",
      }),
    ).toContain("front and answer");
  });
  it("rejects competing draft and study context", () => {
    expect(
      assistantChatRequestSchema.safeParse({
        draft: { sessionId: "s", revision: 0, front: "Q", back: "A" },
        context: { kind: "review", mode: "review", front: "Q" },
        messages: [
          { id: "m", role: "user", parts: [{ type: "text", text: "Explain" }] },
        ],
      }).success,
    ).toBe(false);
  });
});

it("captures document identity alongside the live content", () => {
  expect(
    buildDocumentContext("note", "Cells", "Biology", "<p>ATP</p>", "note-1"),
  ).toMatchObject({ documentId: "note-1", kind: "note" });
  expect(
    buildDocumentContext("mindmap", "Cells", "Biology", "Root -> ATP", "map-1"),
  ).toMatchObject({ documentId: "map-1", kind: "mindmap" });
});
