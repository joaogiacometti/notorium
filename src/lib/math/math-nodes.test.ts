// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { documentToHtml } from "@/lib/editor/document-html";
import { MATH_NODE_SELECTOR, readMathNode } from "@/lib/math/math-nodes";

function mathNodeHtml(latex: string, display: boolean): string {
  return documentToHtml({
    version: 1,
    type: "doc",
    content: [{ type: display ? "blockMath" : "inlineMath", attrs: { latex } }],
  });
}

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
});
