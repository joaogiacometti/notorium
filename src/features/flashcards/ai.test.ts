import { describe, expect, it } from "vitest";

process.env.SKIP_ENV_VALIDATION = "1";

const {
  buildGenerateFlashcardBackPrompt,
  flashcardBackSystemPrompt,
  normalizeGeneratedBack,
  plainTextToRichText,
} = await import("@/features/flashcards/ai");

describe("buildGenerateFlashcardBackPrompt", () => {
  it("includes subject and plain front content", () => {
    const result = buildGenerateFlashcardBackPrompt({
      subjectName: "Biology",
      front: "What is photosynthesis?",
    });

    expect(result).toContain("Subject context: Biology");
    expect(result).toContain(
      "Use the subject only as background context. Answer only what the front asks.",
    );
    expect(result).toContain("Front: What is photosynthesis?");
  });
});

describe("flashcardBackSystemPrompt", () => {
  it("requires concise answers without repeating the front", () => {
    expect(flashcardBackSystemPrompt).toContain(
      "Do not repeat, restate, or paraphrase the front.",
    );
    expect(flashcardBackSystemPrompt).toContain(
      "Default to concise bullet points.",
    );
    expect(flashcardBackSystemPrompt).toContain(
      "Write 3 to 5 short bullets maximum.",
    );
  });

  it("defines optional single example bullets", () => {
    expect(flashcardBackSystemPrompt).toContain(
      'Use at most one bullet starting with "E.g." only when it improves recall.',
    );
  });

  it("bans generic definition wrappers", () => {
    expect(flashcardBackSystemPrompt).toContain(
      'Do not start with generic definition wrappers such as "An approach where...", "A method that...", or "It is...".',
    );
  });

  it("includes compact good examples and bad versus good guidance", () => {
    expect(flashcardBackSystemPrompt).toContain("Front: What is a CPU?");
    expect(flashcardBackSystemPrompt).toContain(
      "Front: What are the main stages of program execution?",
    );
    expect(flashcardBackSystemPrompt).toContain("Bad patterns:");
    expect(flashcardBackSystemPrompt).toContain(
      "Front: Explain how a CPU works.",
    );
    expect(flashcardBackSystemPrompt).toContain("Front: What is RAM?");
  });

  it("keeps subject context secondary", () => {
    expect(flashcardBackSystemPrompt).toContain(
      "Subject context is allowed only as background context.",
    );
    expect(flashcardBackSystemPrompt).toContain(
      "Use the subject only as background context. Answer only what the front asks.",
    );
  });
});

describe("normalizeGeneratedBack", () => {
  it("removes leading answer labels", () => {
    expect(normalizeGeneratedBack("Back: Machine code.")).toBe("Machine code.");
    expect(normalizeGeneratedBack("Answer: Machine code.")).toBe(
      "Machine code.",
    );
  });

  it("removes common list prefaces before bullets", () => {
    expect(
      normalizeGeneratedBack("Key points:\n- Point one\n- Point two"),
    ).toBe("- Point one\n- Point two");
    expect(
      normalizeGeneratedBack(
        "Here are the key points:\n1. Point one\n2. Point two",
      ),
    ).toBe("1. Point one\n2. Point two");
  });
});

describe("plainTextToRichText", () => {
  it("converts paragraphs into rich text html", () => {
    const result = plainTextToRichText("Line one\nLine two");

    expect(result).toBe("<p>Line one Line two</p>");
  });

  it("converts short bullet lists into ul markup", () => {
    const result = plainTextToRichText("- ATP\n- NADPH");

    expect(result).toBe("<ul><li>ATP</li><li>NADPH</li></ul>");
  });

  it("converts numbered lists into ol markup", () => {
    const result = plainTextToRichText("1. Write program\n2. Compile");

    expect(result).toBe("<ol><li>Write program</li><li>Compile</li></ol>");
  });

  it("escapes html content", () => {
    const result = plainTextToRichText("<script>alert(1)</script>");

    expect(result).toBe("<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>");
  });
});
