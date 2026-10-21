import { describe, expect, it } from "vitest";

process.env.SKIP_ENV_VALIDATION = "1";

const {
  buildGenerateFlashcardsPrompt,
  buildImproveFlashcardBackPrompt,
  flashcardBackImproveSystemPrompt,
  flashcardsGenerationSystemPrompt,
} = await import("@/features/flashcards/ai-prompts");

const { normalizeGeneratedBack, normalizeGeneratedCards } = await import(
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

describe("buildGenerateFlashcardsPrompt", () => {
  it("builds prompt with subject name and text", () => {
    const prompt = buildGenerateFlashcardsPrompt({
      subjectName: "Computer Science",
      text: "DNS translates domain names to IP addresses.",
    });
    expect(prompt).toContain("Subject: Computer Science");
    expect(prompt).toContain("DNS translates domain names to IP addresses.");
  });

  it("includes note title when provided", () => {
    const prompt = buildGenerateFlashcardsPrompt({
      subjectName: "Biology",
      noteTitle: "Photosynthesis lecture",
      text: "Chloroplasts contain chlorophyll.",
    });

    expect(prompt).toContain("Subject: Biology");
    expect(prompt).toContain("Note title: Photosynthesis lecture");
    expect(prompt).toContain("Chloroplasts contain chlorophyll.");
  });
});

describe("flashcardsGenerationSystemPrompt", () => {
  it("requires short, direct question fronts", () => {
    expect(flashcardsGenerationSystemPrompt).toContain(
      "Fronts must be short, direct questions that name what to recall, not bare topic names.",
    );
    expect(flashcardsGenerationSystemPrompt).toContain(
      "Front: What is a functional dependency?",
    );
  });

  it("requires minimal directly testable backs", () => {
    expect(flashcardsGenerationSystemPrompt).toContain(
      "Backs must be one atomic sentence or 1 to 3 bullet points.",
    );
    expect(flashcardsGenerationSystemPrompt).toContain(
      "Do not repeat, restate, or paraphrase the front in the back.",
    );
  });

  it("allows source code examples when they are explicit source material", () => {
    expect(flashcardsGenerationSystemPrompt).toContain(
      "preserve the smallest useful snippet in the back as a fenced code block",
    );
  });

  it("includes functional-dependency guidance in the expected style", () => {
    expect(flashcardsGenerationSystemPrompt).toContain(
      "Front: Functional dependency",
    );
    expect(flashcardsGenerationSystemPrompt).toContain(
      "- Relation where X determines Y",
    );
    expect(flashcardsGenerationSystemPrompt).toContain(
      "- For every specific X, Y is fixed",
    );
    expect(flashcardsGenerationSystemPrompt).toContain(
      "Front: What is a functional dependency?",
    );
  });
});

describe("normalizeGeneratedCards", () => {
  it("validates and returns valid cards", () => {
    const result = normalizeGeneratedCards({
      cards: [{ front: "What is DNS?", back: "Domain Name System" }],
    });
    expect(result).toEqual([
      { front: "<p>What is DNS?</p>", back: "<p>Domain Name System</p>" },
    ]);
  });

  it("trims whitespace from front and back", () => {
    const result = normalizeGeneratedCards({
      cards: [{ front: "  What is DNS?  ", back: "  Domain Name System  " }],
    });
    expect(result).toEqual([
      { front: "<p>What is DNS?</p>", back: "<p>Domain Name System</p>" },
    ]);
  });

  it("filters out empty front", () => {
    const result = normalizeGeneratedCards({
      cards: [{ front: "", back: "Some answer" }],
    });
    expect(result).toEqual([]);
  });

  it("filters out empty back", () => {
    const result = normalizeGeneratedCards({
      cards: [{ front: "What is DNS?", back: "" }],
    });
    expect(result).toEqual([]);
  });

  it("filters out whitespace-only front after trim", () => {
    const result = normalizeGeneratedCards({
      cards: [{ front: "   ", back: "Some answer" }],
    });
    expect(result).toEqual([]);
  });

  it("filters out whitespace-only back after trim", () => {
    const result = normalizeGeneratedCards({
      cards: [{ front: "What is DNS?", back: "   " }],
    });
    expect(result).toEqual([]);
  });

  it("returns empty array when all cards are filtered out", () => {
    const result = normalizeGeneratedCards({
      cards: [],
    });
    expect(result).toEqual([]);
  });

  it("filters out invalid cards and keeps valid ones", () => {
    const result = normalizeGeneratedCards({
      cards: [
        { front: "", back: "Invalid - empty front" },
        { front: "Valid", back: "Answer" },
        { front: "  ", back: "Invalid - whitespace only front" },
        { front: "Another valid", back: "Another answer" },
      ],
    });
    expect(result).toEqual([
      { front: "<p>Valid</p>", back: "<p>Answer</p>" },
      { front: "<p>Another valid</p>", back: "<p>Another answer</p>" },
    ]);
  });

  it("converts generated bullet backs into rich text lists", () => {
    const result = normalizeGeneratedCards({
      cards: [{ front: "Network devices", back: "- Router\n- Switch" }],
    });

    expect(result).toEqual([
      {
        front: "<p>Network devices</p>",
        back: "<ul><li>Router</li><li>Switch</li></ul>",
      },
    ]);
  });

  it("returns 50 valid cards when 52 raw cards yield exactly 50 after filtering", () => {
    const cards = Array.from({ length: 52 }, (_, i) => ({
      front: i < 50 ? `Front ${i}` : "",
      back: `Back ${i}`,
    }));
    const result = normalizeGeneratedCards({ cards });
    expect(result).not.toBeNull();
    expect(result).toHaveLength(50);
  });

  it("normalizes inline separators into plain bullet lines", () => {
    const result = normalizeGeneratedCards({
      cards: [
        {
          front: "Queue vs Topic",
          back: "Queue implements point-to-point delivery where each message is processed by exactly one consumer. - Topic implements publish-subscribe delivery where one message is broadcast to all subscribed consumers. - Queues are optimized for task distribution and load balancing among workers. - Topics are optimized for event notification and broadcasting data to multiple independent systems.",
        },
      ],
    });

    expect(result).toEqual([
      {
        front: "<p>Queue vs Topic</p>",
        back: "<ul><li>Queue implements point-to-point delivery where each message is processed by exactly one consumer.</li><li>Topic implements publish-subscribe delivery where one message is broadcast to all subscribed consumers.</li><li>Queues are optimized for task distribution and load balancing among workers.</li><li>Topics are optimized for event notification and broadcasting data to multiple independent systems.</li></ul>",
      },
    ]);
  });
});
