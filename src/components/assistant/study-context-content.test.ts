// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  buildDocumentContext,
  buildPdfContext,
  buildReviewContext,
} from "@/components/assistant/study-context-content";
import {
  describeStudyContext,
  studyContextSchema,
} from "@/features/assistant/study-context";
import { assistantChatRequestSchema } from "@/features/assistant/validation";
import { testDocument } from "@/test/document";

describe("study context snapshots", () => {
  it("preserves note structure and math without attachment URLs", () => {
    const context = buildDocumentContext(
      "note",
      "Variance",
      "Stats",
      testDocument(
        '<p>Variance</p><ul><li>Spread</li></ul><span data-type="inline-math" data-latex="x^2"></span><img src="https://private/image">',
      ),
    );
    expect(context.content).toContain("x^2");
    expect(context.content).toMatch(/-\s+Spread/);
    expect(context.content).toContain("[Image]");
    expect(context.content).not.toContain("https://private");
    expect(context.partial).toBe(false);
  });
  it("preserves URL text without interpreting it as an image", () => {
    const html = "<p>Look at this:</p><p>https://example.com/figure.png</p>";
    const note = buildDocumentContext("note", "Figure", "", testDocument(html));
    const card = buildReviewContext(
      { front: testDocument(html), back: testDocument("Answer") },
      "",
      false,
      "review",
    );
    expect(note.content).toContain("https://example.com/figure.png");
    expect(card.front).toContain("https://example.com/figure.png");
    expect(note.content).not.toContain("[Image]");
  });
  it("caps documents and advertises partial context", () => {
    const context = buildDocumentContext(
      "note",
      "Long",
      "",
      testDocument("x".repeat(12001)),
    );
    expect(context.content).toHaveLength(12000);
    expect(describeStudyContext(context)).toContain("partial context");
    expect(
      studyContextSchema.safeParse({ ...context, content: "x".repeat(12001) })
        .success,
    ).toBe(false);
  });
  it("marks an unrevealed answer hidden and updates card content and mode", () => {
    const card = {
      front: testDocument('<p>Question</p><img src="https://private/image">'),
      back: testDocument("Hidden answer"),
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
        { front: testDocument("Next"), back: testDocument("Next answer") },
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
    buildDocumentContext(
      "note",
      "Cells",
      "Biology",
      testDocument("<p>ATP</p>"),
      "note-1",
    ),
  ).toMatchObject({ documentId: "note-1", kind: "note" });
});

describe("PDF study context", () => {
  const pdf = { id: "pdf-1", title: "Cell biology" };

  it("labels the page and whether the text is a selection", () => {
    const page = buildPdfContext(pdf, "Biology", {
      page: 42,
      scope: "page",
      text: "Mitochondria",
    });
    const selection = { ...page, scope: "selection" as const };
    expect(studyContextSchema.safeParse(page).success).toBe(true);
    expect(describeStudyContext(page)).toBe("Using PDF: Cell biology · p. 42");
    expect(describeStudyContext(selection)).toBe(
      "Using PDF: Cell biology · p. 42 · selection",
    );
  });
  it("caps long text and flags pages without selectable text", () => {
    const long = buildPdfContext(pdf, "", {
      page: 1,
      scope: "selection",
      text: "x".repeat(12001),
    });
    const scanned = buildPdfContext(pdf, "", {
      page: 2,
      scope: "page",
      text: "",
    });
    expect(long.content).toHaveLength(12000);
    expect(describeStudyContext(long)).toContain("partial context");
    expect(describeStudyContext(scanned)).toContain("no selectable text");
  });
});
