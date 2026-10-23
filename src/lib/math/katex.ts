import katex, { type KatexOptions } from "katex";

/**
 * KaTeX options shared by every math surface. `trust: false` blocks injection
 * vectors such as \href and \includegraphics; `throwOnError: false` renders
 * invalid LaTeX as inline error text instead of crashing the editor.
 * `maxSize` and `maxExpand` bound untrusted input, as KaTeX's security notes
 * recommend: an unbounded `\rule` or `\kern` could render an element large
 * enough to break the page layout.
 */
export const MATH_KATEX_OPTIONS: KatexOptions = {
  throwOnError: false,
  trust: false,
  strict: "ignore",
  maxSize: 50,
  maxExpand: 1000,
};

/**
 * Render LaTeX to KaTeX HTML with the shared safe options. `throwOnError: false`
 * already yields error markup for invalid LaTeX; the catch is a final guard.
 *
 * @example
 * renderLatexToHtml("E = mc^2", false);
 */
export function renderLatexToHtml(latex: string, display: boolean): string {
  try {
    return katex.renderToString(latex, {
      ...MATH_KATEX_OPTIONS,
      displayMode: display,
    });
  } catch {
    return "";
  }
}
