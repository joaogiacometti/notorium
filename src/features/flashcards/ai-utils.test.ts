import { describe, expect, it } from "vitest";
import { plainTextToRichText } from "@/features/flashcards/ai-utils";

describe("plainTextToRichText math conversion", () => {
  it("converts inline $...$ into an inline math node", () => {
    expect(plainTextToRichText("The area is $A = \\pi r^2$ exactly")).toBe(
      '<p>The area is <span data-type="inline-math" data-latex="A = \\pi r^2"></span> exactly</p>',
    );
  });

  it("converts a standalone $$...$$ into a block math node", () => {
    expect(plainTextToRichText("$$\\int_0^1 x^2\\,dx = \\tfrac13$$")).toBe(
      '<div data-type="block-math" data-latex="\\int_0^1 x^2\\,dx = \\tfrac13"></div>',
    );
  });

  it("escapes LaTeX special characters into the data-latex attribute", () => {
    expect(plainTextToRichText("Compare $a < b & c$")).toBe(
      '<p>Compare <span data-type="inline-math" data-latex="a &lt; b &amp; c"></span></p>',
    );
  });

  it("supports math inside bullet lines", () => {
    expect(plainTextToRichText("- speed is $v = d/t$")).toBe(
      '<ul><li>speed is <span data-type="inline-math" data-latex="v = d/t"></span></li></ul>',
    );
  });

  it("leaves bare currency amounts untouched", () => {
    expect(plainTextToRichText("It costs $100$ dollars")).toBe(
      "<p>It costs $100$ dollars</p>",
    );
  });

  it("keeps surrounding prose with a block equation", () => {
    expect(
      plainTextToRichText("Newton's second law:\n\n$$F = ma$$\n\nholds"),
    ).toBe(
      '<p>Newton&#39;s second law:</p><div data-type="block-math" data-latex="F = ma"></div><p>holds</p>',
    );
  });
});
