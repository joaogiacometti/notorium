import { describe, expect, it } from "vitest";
import { joinPdfTextItems, normalizePdfText } from "@/components/pdfs/pdf-text";

describe("joinPdfTextItems", () => {
  it("joins text items, breaks lines at EOL, and skips marked content", () => {
    const items = [
      { str: "Cell", hasEOL: false },
      { type: "beginMarkedContent" },
      { str: " membranes", hasEOL: true },
      { str: "control transport.", hasEOL: false },
    ];
    expect(joinPdfTextItems(items)).toBe("Cell membranes\ncontrol transport.");
  });
  it("returns empty text for a page without a text layer", () => {
    expect(joinPdfTextItems([])).toBe("");
  });
});

describe("normalizePdfText", () => {
  it("rejoins words hyphenated across a line break", () => {
    expect(normalizePdfText("photo-\nsynthesis")).toBe("photosynthesis");
  });
  it("keeps hyphens before capitalized words and inside lines", () => {
    expect(normalizePdfText("Navier-\nStokes and well-known")).toBe(
      "Navier-\nStokes and well-known",
    );
  });
  it("expands ligatures without flattening superscripts", () => {
    expect(normalizePdfText("ﬁeld x²")).toBe("field x²");
  });
  it("collapses spacing and blank lines", () => {
    expect(normalizePdfText("  a   b \n\n\n\n c  ")).toBe("a b\n\nc");
  });
});
