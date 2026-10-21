import { describe, expect, it } from "vitest";

process.env.SKIP_ENV_VALIDATION = "1";

const { buildImproveFlashcardBackPrompt, flashcardBackImproveSystemPrompt } =
  await import("@/features/flashcards/ai-prompts");

const { normalizeGeneratedBack } = await import(
  "@/features/flashcards/ai-utils"
);
const { plainTextToRichText } = await import("@/lib/ai/plain-text-rich-text");

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

  it("splits inline bullet separators into newlines", () => {
    expect(
      normalizeGeneratedBack("- Point one - Point two - Point three"),
    ).toBe("- Point one\n- Point two\n- Point three");
    expect(
      normalizeGeneratedBack(
        "Queue implements point-to-point delivery where each message is processed by exactly one consumer. - Topic implements publish-subscribe delivery where one message is broadcast to all subscribed consumers. - Queues are optimized for task distribution and load balancing among workers. - Topics are optimized for event notification and broadcasting data to multiple independent systems.",
      ),
    ).toBe(
      "Queue implements point-to-point delivery where each message is processed by exactly one consumer.\n- Topic implements publish-subscribe delivery where one message is broadcast to all subscribed consumers.\n- Queues are optimized for task distribution and load balancing among workers.\n- Topics are optimized for event notification and broadcasting data to multiple independent systems.",
    );
  });

  it("normalizes dangling dash bullets before wrapped text and code blocks", () => {
    expect(
      normalizeGeneratedBack(
        "- Suitable for simple business logic - Requires rollback actions -\nShould be avoided on core subdomains - May lead to code duplication -\n\n```sql\nUPDATE users SET visits = visits + 1\n```",
      ),
    ).toBe(
      "- Suitable for simple business logic\n- Requires rollback actions\n- Should be avoided on core subdomains\n- May lead to code duplication\n\n```sql\nUPDATE users SET visits = visits + 1\n```",
    );
  });

  it("keeps minus signs inside math and code intact", () => {
    expect(
      normalizeGeneratedBack(
        "- Difference: $a - b$ - Block: $$x - y$$ - Code: `i - 1`\n\n```python\nprint(2 - 1)\n```",
      ),
    ).toBe(
      "- Difference: $a - b$\n- Block: $$x - y$$\n- Code: `i - 1`\n\n```python\nprint(2 - 1)\n```",
    );
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

describe("buildImproveFlashcardBackPrompt", () => {
  it("includes subject, front, and current back content", () => {
    const result = buildImproveFlashcardBackPrompt({
      subjectName: "Biology",
      front: "What is ATP?",
      currentBack: "ATP stores energy.",
    });

    expect(result).toContain("Subject context: Biology");
    expect(result).toContain("Front: What is ATP?");
    expect(result).toContain("Current back: ATP stores energy.");
  });
});

describe("flashcardBackImproveSystemPrompt", () => {
  it("requires always producing an improved version", () => {
    expect(flashcardBackImproveSystemPrompt).toContain(
      "You MUST produce a different, improved version.",
    );
    expect(flashcardBackImproveSystemPrompt).toContain(
      "Never echo the original back unchanged.",
    );
  });

  it("forbids inventing new facts", () => {
    expect(flashcardBackImproveSystemPrompt).toContain(
      "Do not invent facts not implied by the original back.",
    );
  });

  it("bans labels and wrappers in output", () => {
    expect(flashcardBackImproveSystemPrompt).toContain(
      'Do not use labels or wrappers such as "Back:", "Answer:", "Summary:", "Definition:", "Key points:", or "Improved:".',
    );
  });

  it("includes good and bad improvement examples", () => {
    expect(flashcardBackImproveSystemPrompt).toContain("Good improvements:");
    expect(flashcardBackImproveSystemPrompt).toContain("Bad improvements:");
    expect(flashcardBackImproveSystemPrompt).toContain("Current back:");
    expect(flashcardBackImproveSystemPrompt).toContain("Improved:");
    expect(flashcardBackImproveSystemPrompt).toContain(
      "Front: Functional dependency",
    );
    expect(flashcardBackImproveSystemPrompt).toContain(
      "- Relation where X determines Y",
    );
  });

  it("requires the same minimal retrieval style as generation", () => {
    expect(flashcardBackImproveSystemPrompt).toContain(
      "Always rewrite toward concise retrieval practice.",
    );
    expect(flashcardBackImproveSystemPrompt).toContain(
      "Otherwise output a list with 1 to 3 lines.",
    );
    expect(flashcardBackImproveSystemPrompt).toContain(
      "Do not add filler, disclaimers, study tips, examples, caveats, or long explanations.",
    );
  });
});
