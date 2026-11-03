// Tiptap math nodes serialize as empty <span>/<div> elements holding their
// LaTeX in `data-latex` (see tiptap-math-extensions.ts).

/** Matches both inline and block math node elements. */
export const MATH_NODE_SELECTOR =
  '[data-type="inline-math"], [data-type="block-math"]';

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
