import { describe, expect, it } from "vitest";
import { getNoteContentPreview } from "@/features/notes/excerpts";
import { testDocument } from "@/test/document";

describe("getNoteContentPreview", () => {
  it("strips markup from rich text content", () => {
    expect(
      getNoteContentPreview(
        testDocument("<p>Processos <strong>lineares</strong></p>"),
      ),
    ).toBe("Processos lineares");
  });

  it("collapses whitespace and decodes basic entities", () => {
    expect(
      getNoteContentPreview(
        testDocument("<p>Memoria&nbsp;&amp;&nbsp;CPU</p>\n\n"),
      ),
    ).toBe("Memoria & CPU");
  });

  it("truncates long content", () => {
    const preview = getNoteContentPreview(testDocument("a".repeat(100)));

    expect(preview).toHaveLength(72);
    expect(preview.endsWith("...")).toBe(true);
  });

  it("returns a fallback for empty content", () => {
    expect(getNoteContentPreview(testDocument(" <p> </p> "))).toBe(
      "No content yet",
    );
    expect(getNoteContentPreview(null)).toBe("No content yet");
  });
});
