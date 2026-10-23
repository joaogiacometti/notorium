import DOMPurify from "dompurify";
import {
  mathTextToRichText,
  plainTextToRichText,
} from "@/lib/ai/plain-text-rich-text";
import {
  replaceImagesWithPlaceholders,
  restoreImagePlaceholders,
} from "@/lib/editor/rich-text";
import { normalizeReviewedRichText } from "@/lib/editor/rich-text-review-schema";
import { normalizeOverEscapedLatex } from "@/lib/math/dollar-math";
import { MATH_NODE_SELECTOR, readMathNode } from "@/lib/math/math-nodes";

const PROTECTED_MATH_TEXT = `pre, code, ${MATH_NODE_SELECTOR}`;

/** Restore only images belonging to the source field, then normalize to editor HTML.
 * @example restoreDraftReplacement("<p>Short answer</p>", "<p>Long answer</p>");
 */
export function restoreDraftReplacement(
  replacement: string,
  original: string,
): string {
  const { images } = replaceImagesWithPlaceholders(original);
  // Models sometimes JSON-escape LaTeX twice (`\\hat`), which renders as a
  // line break followed by plain text.
  const latex = normalizeOverEscapedLatex(replacement);
  const html = /<\/?[a-z][^>]*>/i.test(latex)
    ? latex
    : plainTextToRichText(latex);
  const sanitized = DOMPurify.sanitize(html, {
    FORBID_TAGS: ["img", "script", "style", "iframe", "object"],
  });
  return normalizeReviewedRichText(
    restoreImagePlaceholders(normalizeDraftMath(sanitized), images),
  );
}

function normalizeDraftMath(html: string): string {
  const template = document.createElement("template");
  template.innerHTML = html;
  repairDraftMathNodes(template.content);
  const walker = document.createTreeWalker(
    template.content,
    NodeFilter.SHOW_TEXT,
  );
  const textNodes: Text[] = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text);
  for (const text of textNodes) {
    const protectedText = text.parentElement?.closest(PROTECTED_MATH_TEXT);
    if (!text.textContent?.includes("$") || protectedText) continue;
    replaceDraftMathText(text);
  }
  return template.innerHTML;
}

// Models sometimes write LaTeX as a math node's text instead of `data-latex`;
// the schema reads only the attribute, so that text became an empty equation.
function repairDraftMathNodes(root: DocumentFragment): void {
  for (const math of root.querySelectorAll(MATH_NODE_SELECTOR)) {
    const latex =
      readMathNode(math).latex.trim() ||
      stripMathDelimiters(math.textContent ?? "");
    if (!latex) {
      math.remove();
      continue;
    }
    math.setAttribute("data-latex", latex);
    math.replaceChildren();
  }
}

function stripMathDelimiters(text: string): string {
  return text
    .trim()
    .replace(/^\$+|\$+$/g, "")
    .trim();
}

function replaceDraftMathText(text: Text): void {
  const fragment = document.createElement("template");
  fragment.innerHTML = mathTextToRichText(text.textContent ?? "");
  const parent = text.parentElement;
  if (
    parent?.tagName === "P" &&
    parent.childNodes.length === 1 &&
    fragment.content.querySelector('[data-type="block-math"]')
  ) {
    parent.replaceWith(fragment.content);
    return;
  }
  text.replaceWith(fragment.content);
}
