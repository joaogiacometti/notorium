import { describe, expect, it } from "vitest";
import {
  delimitLatex,
  normalizeOverEscapedLatex,
  splitDollarMath,
} from "@/lib/math/dollar-math";

describe("splitDollarMath", () => {
  it("separates inline and block math from text", () => {
    expect(splitDollarMath("Area: $A = bh$ and $$x^2$$")).toEqual([
      { kind: "text", text: "Area: " },
      { kind: "math", latex: "A = bh", display: false },
      { kind: "text", text: " and " },
      { kind: "math", latex: "x^2", display: true },
    ]);
  });

  it("keeps currency and empty delimiters literal", () => {
    expect(splitDollarMath("Costs $100$ or $ $")).toEqual([
      { kind: "text", text: "Costs $100$ or $ $" },
    ]);
  });
});

describe("normalizeOverEscapedLatex", () => {
  it("collapses double-escaped commands inside math only", () => {
    expect(normalizeOverEscapedLatex("a\\\\b $\\\\frac{1}{2}$")).toBe(
      "a\\\\b $\\frac{1}{2}$",
    );
  });

  it("keeps real line breaks before non-letters", () => {
    expect(normalizeOverEscapedLatex("$$a \\\\ 1$$")).toBe("$$a \\\\ 1$$");
  });
});

describe("delimitLatex", () => {
  it("wraps inline and block math", () => {
    expect(delimitLatex("x", false)).toBe("$x$");
    expect(delimitLatex("x", true)).toBe("$$x$$");
  });
});
