// Dollar-delimited LaTeX in plain text: `$...$` inline and `$$...$$` block.
// Every surface that reads or writes delimited math in text goes through here.

/** `$$...$$` (block) is tried before `$...$` (inline) via alternation order. */
export const MATH_MARKER_RE = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
// Bare numbers/currency such as `$100$` are not math.
const CURRENCY_LIKE_RE = /^[\d.,\s]+$/;
// Models often double-escape LaTeX inside JSON tool input, so `\frac` arrives
// as `\\frac`. A real `\\` line break is never followed by a command name.
const OVER_ESCAPED_COMMAND_RE = /\\\\(?=[A-Za-z])/g;

export type DollarMathSegment =
  | { kind: "text"; text: string }
  | { kind: "math"; latex: string; display: boolean };

/**
 * Split text into literal runs and math runs. Empty math and inline amounts
 * such as `$100$` stay literal text.
 *
 * @example
 * splitDollarMath("Area: $A = bh$"); // [{kind:"text",text:"Area: "}, {kind:"math",latex:"A = bh",display:false}]
 */
export function splitDollarMath(value: string): DollarMathSegment[] {
  const segments: DollarMathSegment[] = [];
  let cursor = 0;
  for (const match of value.matchAll(MATH_MARKER_RE)) {
    const display = match[1] !== undefined;
    const latex = (match[1] ?? match[2] ?? "").trim();
    if (!latex || (!display && CURRENCY_LIKE_RE.test(latex))) continue;
    if (match.index > cursor)
      segments.push({ kind: "text", text: value.slice(cursor, match.index) });
    segments.push({ kind: "math", latex, display });
    cursor = match.index + match[0].length;
  }
  if (cursor < value.length)
    segments.push({ kind: "text", text: value.slice(cursor) });
  return segments;
}

/**
 * Wrap LaTeX in its round-trippable delimiters.
 *
 * @example
 * delimitLatex("x^2", true); // "$$x^2$$"
 */
export function delimitLatex(latex: string, display: boolean): string {
  const delimiter = display ? "$$" : "$";
  return `${delimiter}${latex}${delimiter}`;
}

/**
 * Undo JSON double-escaping of LaTeX commands inside math runs only, leaving
 * prose and code untouched.
 *
 * @example
 * normalizeOverEscapedLatex("$\\\\frac{1}{2}$"); // "$\\frac{1}{2}$"
 */
export function normalizeOverEscapedLatex(value: string): string {
  return value.replace(MATH_MARKER_RE, (math) =>
    math.replace(OVER_ESCAPED_COMMAND_RE, "\\"),
  );
}
