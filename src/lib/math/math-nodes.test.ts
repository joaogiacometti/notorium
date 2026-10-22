// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  delimitMathNodesInHtml,
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

  it("writes math nodes inside HTML as dollar-delimited LaTeX", () => {
    const html = `<ul><li><p><strong>${mathNodeHtml("w_1", false)} weight</strong></p></li></ul>${mathNodeHtml("a < b", true)}`;
    expect(delimitMathNodesInHtml(html)).toBe(
      "<ul><li><p><strong>$w_1$ weight</strong></p></li></ul><p>$$a &lt; b$$</p>",
    );
  });
});
