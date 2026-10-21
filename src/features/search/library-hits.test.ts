import { describe, expect, it } from "vitest";
import { libraryHitSchema } from "@/features/assistant/library-search-contract";
import { buildLibraryHit } from "@/features/search/library-hits";
import { LIMITS, SUBJECT_PATH_MAX_CHARS } from "@/lib/config/limits";

const longBody = `${"Intro sentence. ".repeat(20)}A mitose produz duas células.${" Fim.".repeat(40)}`;

describe("buildLibraryHit", () => {
  it("centers the excerpt on the first term found, ignoring accents", () => {
    const hit = buildLibraryHit(
      {
        kind: "note",
        id: "n1",
        subjectId: "s1",
        title: "Divisão celular",
        body: longBody,
      },
      ["meiose", "celulas"],
      "Biologia",
    );

    expect(hit.title).toBe("Divisão celular");
    expect(hit.snippet).toContain("duas células");
    expect(hit.snippet.startsWith("...")).toBe(true);
  });

  it("starts the excerpt at the top when only a fuzzy match hit", () => {
    const hit = buildLibraryHit(
      {
        kind: "flashcard",
        id: "c1",
        subjectId: "s1",
        title: "Q",
        body: longBody,
      },
      ["mitocondria"],
      "Biologia",
    );

    expect(hit.snippet.startsWith("Intro sentence.")).toBe(true);
  });

  it("collapses whitespace and stays within the contract limits", () => {
    const hit = buildLibraryHit(
      {
        kind: "mindmap",
        id: "m1",
        subjectId: "s1",
        title: `Line one\n\n  line two ${"x".repeat(500)}`,
        body: "",
      },
      ["line"],
      "A::".repeat(SUBJECT_PATH_MAX_CHARS),
    );

    expect(hit.title.startsWith("Line one line two")).toBe(true);
    expect(hit.title.length).toBeLessThanOrEqual(
      LIMITS.assistantLibraryExcerptMaxChars + 3,
    );
    expect(libraryHitSchema.safeParse(hit).success).toBe(true);
  });
});
