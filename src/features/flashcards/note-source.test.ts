import { describe, expect, it } from "vitest";
import { LIMITS } from "@/lib/config/limits";
import { buildNoteFlashcardSource } from "./note-source";

describe("buildNoteFlashcardSource", () => {
  it("includes note title and plain body text", () => {
    const result = buildNoteFlashcardSource({
      title: "Photosynthesis lecture",
      content: "<p>Chlorophyll captures light.</p>",
    });

    expect(result).toContain("Title: Photosynthesis lecture");
    expect(result).toContain("Chlorophyll captures light.");
  });

  it("keeps image placeholders in note body text", () => {
    const result = buildNoteFlashcardSource({
      title: "Diagram note",
      content: '<p>Cell cycle</p><img src="/image.png">',
    });

    expect(result).toContain("Cell cycle [Image]");
  });

  it("caps source text to the AI input limit", () => {
    const result = buildNoteFlashcardSource({
      title: "Long note",
      content: "a".repeat(LIMITS.flashcardAiMaxInput + 100),
    });

    expect(result.length).toBeLessThanOrEqual(LIMITS.flashcardAiMaxInput);
    expect(result).toContain("Title: Long note");
  });
});
