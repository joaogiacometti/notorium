import { describe, expect, it } from "vitest";
import {
  composeProposedFlashcardBack,
  findProposedSubjectId,
  formatFlashcardExample,
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
