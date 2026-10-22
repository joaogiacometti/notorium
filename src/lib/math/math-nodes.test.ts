// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  MATH_NODE_SELECTOR,
  mathNodeHtml,
  mathNodeToDelimitedLatex,
  readMathNode,
} from "@/lib/math/math-nodes";

function parseMathNode(html: string): Element {
  const container = document.createElement("div");
  container.innerHTML = html;
  const node = container.querySelector(MATH_NODE_SELECTOR);
  if (!node) throw new Error(`Expected a math node in ${html}`);
  return node;
}

describe("math nodes", () => {
  it("round-trips LaTeX with HTML-significant characters", () => {
    const node = parseMathNode(mathNodeHtml('a < b & "c"', false));
    expect(readMathNode(node)).toEqual({
      latex: 'a < b & "c"',
      display: false,
    });
  });

  it("serializes block nodes with block delimiters", () => {
    expect(
      mathNodeToDelimitedLatex(parseMathNode(mathNodeHtml("x", true))),
    ).toBe("$$x$$");
  });
});
