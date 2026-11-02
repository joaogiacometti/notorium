// Dollar-delimited LaTeX in plain text: `$...$` inline and `$$...$$` block.
// Every surface that reads or writes delimited math in text goes through here.

/** `$$...$$` (block) is tried before `$...$` (inline) via alternation order. */
export const MATH_MARKER_RE = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
// Models often double-escape LaTeX inside JSON tool input, so `\frac` arrives
// as `\\frac`. A real `\\` line break is never followed by a command name.
const OVER_ESCAPED_COMMAND_RE = /\\\\(?=[A-Za-z])/g;

// JSON decodes an unescaped command prefix as a control character. Repair only
// recognized commands, inside math; never reinterpret ordinary prose or code.
const JSON_COMMAND_PREFIXES = new Map([
  ["\b", "b"],
  ["\f", "f"],
  ["\t", "t"],
  ["\r", "r"],
  ["\n", "n"],
]);
const RECOVERABLE_COMMANDS = new Set([
  "beta",
  "bar",
  "begin",
  "boldsymbol",
  "frac",
  "times",
  "text",
  "theta",
  "tan",
  "right",
  "rightarrow",
  "rho",
  "nabla",
  "nu",
  "neq",
]);

export type DollarMathSegment =
  | { kind: "text"; text: string }
  | { kind: "math"; latex: string; display: boolean };

/**
 * Split text into literal runs and math runs. A paired delimiter explicitly
 * marks math, including numeric answers; empty or unmatched delimiters stay text.
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
    if (!latex) continue;
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
  // Inline math normally excludes newlines, but JSON-corrupted commands may
  // contain one before repair. Do not otherwise change delimiter recognition.
  return value.replace(/\$\$[\s\S]+?\$\$|\$[^$]+?\$/g, (math) => {
    return math
      .replace(OVER_ESCAPED_COMMAND_RE, "\\")
      .replace(
        /([\s\S])([A-Za-z]+)/g,
        (original, prefix: string, suffix: string) => {
          const letter = JSON_COMMAND_PREFIXES.get(prefix);
          const command = `${letter}${suffix}`;
          return letter && RECOVERABLE_COMMANDS.has(command)
            ? `\\${command}`
            : original;
        },
      );
  });
}
