// Text limits at the assistant HTML input boundary. Stored documents use documentText.
// Math nodes serialize as empty <span>/<div> with the LaTeX held in a
// data-latex attribute (see tiptap-math-extensions.ts). A plain tag strip would
// drop that attribute, so equations must be surfaced as their LaTeX text to stay
// searchable and to keep flashcard length validation accurate.
const MATH_NODE_PATTERN =
  /<(span|div)\b[^>]*\bdata-type="(?:inline|block)-math"[^>]*>[\s\S]*?<\/\1>/gi;

// Private-use sentinel marking where extracted LaTeX is reinserted. It carries
// no angle brackets or HTML entities and is not whitespace, so it survives the
// tag-stripping and whitespace-collapsing passes below intact.
const MATH_TOKEN_SENTINEL = "\uE000";

/**
 * Runs `transform` (tag stripping, whitespace collapse, casing) on the input
 * with each math node swapped for an inert token, then restores every equation's
 * decoded LaTeX. Decoding the LaTeX inline before `transform` would let its
 * `<`/`>` characters be eaten by the `/<[^>]*>/g` tag strip — e.g. the equation
 * `f(x) < g(x) > 0` would collapse to `f(x)  0`. Tokenizing keeps the LaTeX out
 * of the strip's reach.
 */
function transformAroundMath(
  value: string,
  transform: (mathFreeHtml: string) => string,
): string {
  const equations: string[] = [];
  const tokenized = value.replaceAll(MATH_NODE_PATTERN, (match) => {
    const latexMatch = /\bdata-latex="([^"]*)"/i.exec(match);
    if (!latexMatch) {
      return " ";
    }

    const index = equations.length;
    equations.push(decodeHtmlEntities(latexMatch[1]));
    return ` ${MATH_TOKEN_SENTINEL}${index}${MATH_TOKEN_SENTINEL} `;
  });

  let result = transform(tokenized);
  equations.forEach((latex, index) => {
    result = result.replaceAll(
      `${MATH_TOKEN_SENTINEL}${index}${MATH_TOKEN_SENTINEL}`,
      latex,
    );
  });

  return result;
}

export function editorHtmlText(value: string): string {
  return transformAroundMath(value, (html) =>
    html
      .replaceAll(/<[^>]*>/g, " ")
      .replaceAll("&nbsp;", " ")
      .replaceAll(/\s+/g, " ")
      .trim(),
  );
}
function decodeHtmlEntities(value: string): string {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}
