import { describe, expect, it } from "vitest";

process.env.SKIP_ENV_VALIDATION = "1";

const {
  buildGenerateFlashcardBackPrompt,
  buildGenerateFlashcardsPrompt,
  buildImproveFlashcardBackPrompt,
  flashcardBackSystemPrompt,
  flashcardBackImproveSystemPrompt,
  normalizeGeneratedCards,
} = await import("@/features/flashcards/ai-prompts");

const { normalizeGeneratedBack, plainTextToRichText } = await import(
  "@/features/flashcards/ai-utils"
);

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

  it("includes deck context when provided", () => {
    const result = buildGenerateFlashcardBackPrompt({
      subjectName: "Biology",
      deckName: "Metabolism",
      front: "What is ATP?",
    });

    expect(result).toContain("Deck context: Metabolism");
  });
});

describe("flashcardBackSystemPrompt", () => {
  it("requires concise answers without repeating the front", () => {
    expect(flashcardBackSystemPrompt).toContain(
      "Do not repeat, restate, or paraphrase the front.",
    );
    expect(flashcardBackSystemPrompt).toContain(
      "If the answer is a single atomic fact, output one concise sentence only.",
    );
    expect(flashcardBackSystemPrompt).toContain(
      "Otherwise output a list with 3 to 5 lines.",
    );
  });

  it("enforces strict list formatting", () => {
    expect(flashcardBackSystemPrompt).toContain(
      'In list mode, every line must start with "- ".',
    );
    expect(flashcardBackSystemPrompt).toContain(
      'In list mode, do not use inline separators like " - " inside a line.',
    );
    expect(flashcardBackSystemPrompt).toContain(
      "In list mode, do not use numbering.",
    );
  });

  it("allows one optional list example line and forbids e.g shorthand", () => {
    expect(flashcardBackSystemPrompt).toContain(
      'In list mode, you may include at most one final bullet starting with "- Example:"',
    );
    expect(flashcardBackSystemPrompt).toContain(
      "Do not use it for definitions, facts, or concepts that are self-explanatory.",
    );
    expect(flashcardBackSystemPrompt).toContain(
      'Do not use bullets starting with "E.g." or "Ex.".',
    );
  });

  it("bans generic definition wrappers", () => {
    expect(flashcardBackSystemPrompt).toContain(
      'Do not start with generic definition wrappers such as "An approach where...", "A method that...", or "It is...".',
    );
  });

  it("includes compact good examples and bad versus good guidance", () => {
    expect(flashcardBackSystemPrompt).toContain(
      "Front: What does DNS stand for?",
    );
    expect(flashcardBackSystemPrompt).toContain("Front: What is DNS?");
    expect(flashcardBackSystemPrompt).toContain("Front: What is a CPU?");
    expect(flashcardBackSystemPrompt).toContain(
      "Front: What are the main stages of program execution?",
    );
    expect(flashcardBackSystemPrompt).toContain("Bad patterns:");
    expect(flashcardBackSystemPrompt).toContain("Front: Tabela CAN");
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

  it("includes deck context when provided", () => {
    const prompt = buildGenerateFlashcardsPrompt({
      subjectName: "Computer Science",
      deckName: "Networking",
      text: "DNS translates domain names to IP addresses.",
    });
    expect(prompt).toContain("Deck: Networking");
  });
});

describe("normalizeGeneratedCards", () => {
  it("validates and returns valid cards", () => {
    const result = normalizeGeneratedCards({
      cards: [{ front: "What is DNS?", back: "Domain Name System" }],
    });
    expect(result).toEqual([
      { front: "What is DNS?", back: "Domain Name System" },
    ]);
  });

  it("trims whitespace from front and back", () => {
    const result = normalizeGeneratedCards({
      cards: [{ front: "  What is DNS?  ", back: "  Domain Name System  " }],
    });
    expect(result).toEqual([
      { front: "What is DNS?", back: "Domain Name System" },
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
      { front: "Valid", back: "Answer" },
      { front: "Another valid", back: "Another answer" },
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
        front: "Queue vs Topic",
        back: "- Queue implements point-to-point delivery where each message is processed by exactly one consumer.\n- Topic implements publish-subscribe delivery where one message is broadcast to all subscribed consumers.\n- Queues are optimized for task distribution and load balancing among workers.\n- Topics are optimized for event notification and broadcasting data to multiple independent systems.",
      },
    ]);
  });
});
