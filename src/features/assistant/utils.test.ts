import { describe, expect, it } from "vitest";
import {
  composeProposedFlashcardBack,
  findProposedSubjectId,
  formatFlashcardExample,
  getLibraryHitHref,
  isAssistantReplyInFlight,
  readFlashcardProposalParts,
  readLibrarySearchParts,
} from "@/features/assistant/utils";

const subjects = [
  { id: "bio", path: "Biology" },
  { id: "cells", path: "Biology::Cells" },
];

describe("findProposedSubjectId", () => {
  it("matches an exact path", () => {
    expect(findProposedSubjectId(subjects, "Biology::Cells")).toBe("cells");
  });

  it("matches ignoring case and spacing around separators", () => {
    expect(findProposedSubjectId(subjects, " biology :: CELLS")).toBe("cells");
  });

  it("returns null for a missing or unknown path", () => {
    expect(findProposedSubjectId(subjects, undefined)).toBeNull();
    expect(findProposedSubjectId(subjects, "Chemistry")).toBeNull();
  });
});

describe("formatFlashcardExample", () => {
  it("fences the code with its language tag", () => {
    expect(formatFlashcardExample({ language: "sql", code: "SELECT 1;" })).toBe(
      "```sql\nSELECT 1;\n```",
    );
  });

  it("drops tag characters the rich-text fence would not recognize", () => {
    expect(formatFlashcardExample({ language: "c++", code: "int x;" })).toBe(
      "```c\nint x;\n```",
    );
  });
});

describe("composeProposedFlashcardBack", () => {
  const card = { front: "findall/3", back: "- Keeps duplicates" };

  it("returns the back unchanged without an example", () => {
    expect(composeProposedFlashcardBack(card)).toBe("- Keeps duplicates");
  });

  it("appends the example block after the back", () => {
    const example = { language: "prolog", code: "?- findall(X, p(X), L)." };

    expect(composeProposedFlashcardBack({ ...card, example })).toBe(
      "- Keeps duplicates\n\n```prolog\n?- findall(X, p(X), L).\n```",
    );
  });
});

describe("isAssistantReplyInFlight", () => {
  it("is true only while a reply is requested or streaming", () => {
    expect(isAssistantReplyInFlight("submitted")).toBe(true);
    expect(isAssistantReplyInFlight("streaming")).toBe(true);
    expect(isAssistantReplyInFlight("ready")).toBe(false);
    expect(isAssistantReplyInFlight("error")).toBe(false);
  });
});

describe("readFlashcardProposalParts", () => {
  it("keeps only flashcard proposal calls", () => {
    const proposal = {
      type: "tool-proposeFlashcards" as const,
      toolCallId: "call-1",
      state: "input-available" as const,
      input: { cards: [{ front: "What is ATP?", back: "Energy carrier" }] },
    };

    expect(
      readFlashcardProposalParts({
        id: "m1",
        role: "assistant",
        parts: [{ type: "text", text: "Here you go." }, proposal],
      }),
    ).toEqual([proposal]);
  });
});

describe("readLibrarySearchParts", () => {
  it("keeps only library search calls", () => {
    const search = {
      type: "tool-searchLibrary" as const,
      toolCallId: "call-1",
      state: "input-available" as const,
      input: { terms: ["mitosis"] },
    };

    expect(
      readLibrarySearchParts({
        id: "m1",
        role: "assistant",
        parts: [{ type: "text", text: "Checking." }, search],
      }),
    ).toEqual([search]);
  });
});

describe("getLibraryHitHref", () => {
  const hit = {
    id: "item-1",
    subjectId: "subject-1",
    title: "Mitosis",
    subjectPath: "Biology",
    snippet: "",
  };

  it("links each kind to its detail page", () => {
    expect(getLibraryHitHref({ ...hit, kind: "note" })).toBe(
      "/subjects/subject-1/documents/notes/item-1",
    );
    expect(getLibraryHitHref({ ...hit, kind: "mindmap" })).toBe(
      "/subjects/subject-1/documents/mindmaps/item-1",
    );
    expect(getLibraryHitHref({ ...hit, kind: "flashcard" })).toBe(
      "/flashcards/item-1",
    );
  });
});
