import { describe, expect, it } from "vitest";
import {
  hasClozeMarkers,
  parseClozeOrdinals,
  renderClozeBack,
  renderClozeFront,
  stripClozeMarkers,
} from "@/features/flashcards/cloze";

describe("hasClozeMarkers", () => {
  it("detects a well-formed marker", () => {
    expect(hasClozeMarkers("The capital is {{c1::Paris}}.")).toBe(true);
  });

  it("returns false without markers", () => {
    expect(hasClozeMarkers("The capital is Paris.")).toBe(false);
  });

  it("returns false for an incomplete marker", () => {
    expect(hasClozeMarkers("{{c1::Paris")).toBe(false);
  });

  it("is repeatable despite the shared global regex", () => {
    const source = "{{c1::a}}";
    expect(hasClozeMarkers(source)).toBe(true);
    expect(hasClozeMarkers(source)).toBe(true);
  });
});

describe("parseClozeOrdinals", () => {
  it("returns distinct ordinals in ascending order", () => {
    expect(
      parseClozeOrdinals("{{c2::b}} then {{c1::a}} and {{c1::z}}"),
    ).toEqual([1, 2]);
  });

  it("returns an empty array without markers", () => {
    expect(parseClozeOrdinals("no markers")).toEqual([]);
  });
});

describe("renderClozeFront", () => {
  it("blanks the target ordinal and reveals siblings", () => {
    expect(renderClozeFront("{{c1::Paris}} in {{c2::France}}", 1)).toBe(
      "<mark>[...]</mark> in France",
    );
  });

  it("uses the hint as the blank label when present", () => {
    expect(renderClozeFront("{{c1::Paris::capital}}", 1)).toBe(
      "<mark>[capital]</mark>",
    );
  });

  it("blanks every occurrence of the target ordinal", () => {
    expect(renderClozeFront("{{c1::a}} and {{c1::a}}", 1)).toBe(
      "<mark>[...]</mark> and <mark>[...]</mark>",
    );
  });
});

describe("renderClozeBack", () => {
  it("highlights the target answer and reveals siblings", () => {
    expect(renderClozeBack("{{c1::Paris}} in {{c2::France}}", 1)).toBe(
      "<mark>Paris</mark> in France",
    );
  });

  it("drops the hint when revealing the answer", () => {
    expect(renderClozeBack("{{c1::Paris::capital}}", 1)).toBe(
      "<mark>Paris</mark>",
    );
  });
});

describe("stripClozeMarkers", () => {
  it("reduces markers to their bare answers", () => {
    expect(stripClozeMarkers("{{c1::Paris}} in {{c2::France}}")).toBe(
      "Paris in France",
    );
  });
});
