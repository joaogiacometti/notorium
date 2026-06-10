import { describe, expect, it } from "vitest";

process.env.SKIP_ENV_VALIDATION = "1";

const {
  buildGenerateFlashcardBackPrompt,
  buildGenerateFlashcardsPrompt,
  buildImproveFlashcardBackPrompt,
  flashcardBackSystemPrompt,
  flashcardBackImproveSystemPrompt,
  flashcardsGenerationSystemPrompt,
  flashcardValidationSystemPrompt,
  buildMergeSynthesisPrompt,
  flashcardMergeSynthesisOutputSchema,
  flashcardMergeSynthesisSystemPrompt,
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

describe("buildMergeSynthesisPrompt", () => {
  it("labels the primary card and each candidate with its id", () => {
    const result = buildMergeSynthesisPrompt({
      primary: {
        id: "f1",
        front: "DNS acronym",
        back: "Domain Name System.",
        deckName: "Networking",
      },
      candidates: [
        {
          id: "f2",
          front: "DNS role",
          back: "Resolves names to IP addresses.",
          deckName: "Networking",
        },
      ],
    });

    expect(result).toContain("Primary mastered card (ID: f1)");
    expect(result).toContain("Candidate 1 (ID: f2)");
    expect(result).toContain("Deck: Networking");
    expect(result).toContain("Front: DNS role");
  });
});

describe("flashcardMergeSynthesisSystemPrompt", () => {
  it("prefers relationship cards, restricts merging, and allows declining", () => {
    expect(flashcardMergeSynthesisSystemPrompt).toContain(
      'ACTION "relate" — the preferred, common outcome.',
    );
    expect(flashcardMergeSynthesisSystemPrompt).toContain(
      'ACTION "merge" — rare; only for true redundancy.',
    );
    expect(flashcardMergeSynthesisSystemPrompt).toContain(
      "never combine two independent definitions",
    );
    expect(flashcardMergeSynthesisSystemPrompt).toContain(
      "Declining is better than a forced, trivial connection.",
    );
    expect(flashcardMergeSynthesisSystemPrompt).toContain(
      "Do not invent facts not present in the input cards.",
    );
  });
});

describe("flashcardMergeSynthesisOutputSchema", () => {
  it("accepts a relate proposal", () => {
    const result = flashcardMergeSynthesisOutputSchema.safeParse({
      action: "relate",
      front: "Velocity in terms of story points",
      back: "- Total story points delivered per sprint",
      sourceFlashcardIds: ["f2"],
      rationale: "Velocity is computed from story points.",
    });

    expect(result.success).toBe(true);
  });

  it("accepts a decline without card content", () => {
    const result = flashcardMergeSynthesisOutputSchema.safeParse({
      action: "decline",
      sourceFlashcardIds: [],
      rationale: "The candidates test distinct definitions.",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.front).toBe("");
      expect(result.data.back).toBe("");
    }
  });

  it("rejects output without an action decision", () => {
    const result = flashcardMergeSynthesisOutputSchema.safeParse({
      front: "DNS essentials",
      back: "Domain Name System.",
      sourceFlashcardIds: ["f2"],
      rationale: "n/a",
    });

    expect(result.success).toBe(false);
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
      "Otherwise output a list with 1 to 3 lines.",
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

  it("forbids example bullets and extra details", () => {
    expect(flashcardBackSystemPrompt).toContain(
      "Do not add filler, disclaimers, study tips, examples, caveats, or long explanations.",
    );
    expect(flashcardBackSystemPrompt).toContain(
      'Do not use bullets starting with "Example:", "E.g.", or "Ex.".',
    );
  });

  it("bans generic definition wrappers", () => {
    expect(flashcardBackSystemPrompt).toContain(
      'Do not start with generic definition wrappers such as "An approach where...", "A method that...", or "It is...".',
    );
  });

  it("includes compact good examples and bad versus good guidance", () => {
    expect(flashcardBackSystemPrompt).toContain("Front: DNS acronym");
    expect(flashcardBackSystemPrompt).toContain("Front: Functional dependency");
    expect(flashcardBackSystemPrompt).toContain("Front: CPU role");
    expect(flashcardBackSystemPrompt).toContain("Front: Program counter");
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

  it("includes deck context when provided", () => {
    const prompt = buildGenerateFlashcardsPrompt({
      subjectName: "Computer Science",
      deckName: "Networking",
      text: "DNS translates domain names to IP addresses.",
    });
    expect(prompt).toContain("Deck: Networking");
  });

  it("includes note title when provided", () => {
    const prompt = buildGenerateFlashcardsPrompt({
      subjectName: "Biology",
      deckName: "Metabolism",
      noteTitle: "Photosynthesis lecture",
      text: "Chloroplasts contain chlorophyll.",
    });

    expect(prompt).toContain("Subject: Biology");
    expect(prompt).toContain("Deck: Metabolism");
    expect(prompt).toContain("Note title: Photosynthesis lecture");
    expect(prompt).toContain("Chloroplasts contain chlorophyll.");
  });
});

describe("flashcardsGenerationSystemPrompt", () => {
  it("requires concise retrieval-cue fronts", () => {
    expect(flashcardsGenerationSystemPrompt).toContain(
      "Fronts must be concise retrieval cues, usually noun phrases, not full questions.",
    );
    expect(flashcardsGenerationSystemPrompt).toContain(
      'Avoid "What is...", "Explain...", or other verbose question wrappers unless needed for clarity.',
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

describe("flashcardValidationSystemPrompt", () => {
  it("accepts terse cue fronts and concise backs as valid style", () => {
    expect(flashcardValidationSystemPrompt).toContain(
      '"Functional dependency" is correct. Do not require "What is a functional dependency?".',
    );
    expect(flashcardValidationSystemPrompt).toContain(
      "Backs are intentionally concise. One atomic sentence or 1 to 3 precise bullets is correct style.",
    );
    expect(flashcardValidationSystemPrompt).toContain(
      "Do not flag a back as confusing only because it omits extra explanation, examples, caveats, or context.",
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
