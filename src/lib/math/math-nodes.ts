// Tiptap math nodes serialize as empty <span>/<div> elements holding their
// LaTeX in `data-latex` (see tiptap-math-extensions.ts).
import { escapeHtml } from "@/lib/html-escape";
import { delimitLatex } from "@/lib/math/dollar-math";

/** Matches both inline and block math node elements. */
export const MATH_NODE_SELECTOR =
  '[data-type="inline-math"], [data-type="block-math"]';

/**
 * Editor HTML for one math node.
 *
 * @example
 * mathNodeHtml("x^2", false); // '<span data-type="inline-math" data-latex="x^2"></span>'
 */
export function mathNodeHtml(latex: string, display: boolean): string {
  const attributes = `data-latex="${escapeHtml(latex)}"`;
  return display
    ? `<div data-type="block-math" ${attributes}></div>`
    : `<span data-type="inline-math" ${attributes}></span>`;
}

/**
 * Read a math node's LaTeX and kind back from the DOM.
 *
 * @example
 * readMathNode(element); // {latex: "x^2", display: false}
 */
export function readMathNode(element: Element): {
  latex: string;
  display: boolean;
} {
  return {
    latex: element.getAttribute("data-latex") ?? "",
    display: element.getAttribute("data-type") === "block-math",
  };
}

/**
 * The math node as delimited `$...$`/`$$...$$` text, so plain-text and Markdown
 * exports keep equations instead of dropping the empty element.
 *
 * @example
 * mathNodeToDelimitedLatex(element); // "$x^2$"
 */
export function mathNodeToDelimitedLatex(element: Element): string {
  const { latex, display } = readMathNode(element);
  return delimitLatex(latex, display);
}
