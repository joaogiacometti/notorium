// Converts AI plain-text output (paragraphs, `- `/`1.` lists, inline/fenced code, and
// `$...$`/`$$...$$` LaTeX) into Tiptap rich-text HTML. Pure and isomorphic:
// flashcard back improvement runs it on the server, the study assistant in the browser.

import { escapeHtml } from "@/lib/html-escape";
import { splitDollarMath } from "@/lib/math/dollar-math";
import { mathNodeHtml } from "@/lib/math/math-nodes";

function codeBlockHtml(language: string, code: string): string {
  const className = language ? ` class="language-${escapeHtml(language)}"` : "";
  return `<pre><code${className}>${escapeHtml(code.trimEnd())}</code></pre>`;
}

export function normalizeLine(value: string) {
  return value.replaceAll(/\s+/g, " ").trim();
}

type MathSegment = { token: string; latex: string; display: boolean };
type CodeSegment = { token: string; html: string; block: boolean };

// Protect code before parsing math or collapsing paragraph whitespace. Accept
// accidental inline <code> wrappers, but always escape their contents as text.
function extractCodeSegments(value: string): {
  text: string;
  segments: CodeSegment[];
} {
  const segments: CodeSegment[] = [];
  const chunks: string[] = [];
  let cursor = 0;
  const pattern =
    /```([A-Za-z0-9_-]*)\n([\s\S]*?)```|`([^`\n]+)`|<code>([\s\S]*?)<\/code>/g;
  for (const match of value.matchAll(pattern)) {
    const segment = captureCodeSegment(match, segments.length);
    chunks.push(value.slice(cursor, match.index));
    chunks.push(segment.block ? `\n\n${segment.token}\n\n` : segment.token);
    segments.push(segment);
    cursor = match.index + match[0].length;
  }
  return { text: chunks.join("") + value.slice(cursor), segments };
}

function captureCodeSegment(
  match: RegExpMatchArray,
  index: number,
): CodeSegment {
  const [, language, fenced, inline, wrapped] = match;
  const block = fenced !== undefined;
  return {
    token: `CODEMARKER${index}END`,
    block,
    html: block
      ? codeBlockHtml(language ?? "", fenced)
      : `<code>${escapeHtml(inline ?? wrapped ?? "")}</code>`,
  };
}

function restoreCodeSegments(html: string, segments: CodeSegment[]): string {
  let result = html;
  for (const segment of segments) {
    const target = segment.block ? `<p>${segment.token}</p>` : segment.token;
    result = result.replaceAll(target, () => segment.html);
  }
  return result;
}

// Pull math out before line processing so escaping/classification cannot corrupt
// the LaTeX, then reinsert math nodes after the HTML skeleton is built. Tokens
// are plain alphanumerics so normalizeLine, escapeHtml, and classifyLines leave
// them untouched.
function extractMathSegments(value: string): {
  text: string;
  segments: MathSegment[];
} {
  const segments: MathSegment[] = [];
  const text = splitDollarMath(value)
    .map((part) => {
      if (part.kind === "text") return part.text;
      const token = `MATHMARKER${segments.length}END`;
      segments.push({ token, latex: part.latex, display: part.display });
      return token;
    })
    .join("");

  return { text, segments };
}

function renderMathSegments(html: string, segments: MathSegment[]): string {
  let result = html;
  for (const segment of segments) {
    const node = mathNodeHtml(segment.latex, segment.display);
    if (segment.display)
      result = result.replaceAll(`<p>${segment.token}</p>`, node);
    result = result.replaceAll(segment.token, node);
  }

  return result;
}

type BlockType = "bullet" | "ordered" | "paragraph";

function classifyLines(lines: string[]): BlockType {
  const isBullet = lines.every((line) => /^[-*]\s+/.test(line));
  if (isBullet) return "bullet";

  const isOrdered = lines.every((line) => /^\d+\.\s+/.test(line));
  if (isOrdered) return "ordered";

  return "paragraph";
}

function textBlocksToRichText(value: string): string {
  const blocks = value
    .replaceAll("\r\n", "\n")
    .split(/\n\s*\n/g)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);

  return blocks
    .map((block) => {
      const lines = block
        .split("\n")
        .map(normalizeLine)
        .filter((line) => line.length > 0);

      const type = classifyLines(lines);

      if (type === "bullet") {
        return `<ul>${lines
          .map((line) => `<li>${escapeHtml(line.replace(/^[-*]\s+/, ""))}</li>`)
          .join("")}</ul>`;
      }

      if (type === "ordered") {
        return `<ol>${lines
          .map(
            (line) => `<li>${escapeHtml(line.replace(/^\d+\.\s+/, ""))}</li>`,
          )
          .join("")}</ol>`;
      }

      return `<p>${escapeHtml(lines.join(" "))}</p>`;
    })
    .join("");
}

/** Convert assistant text to safe editor HTML, preserving code literally.
 * @example plainTextToRichText("What does `functor/3` do?");
 */
export function plainTextToRichText(value: string): string {
  const code = extractCodeSegments(value);
  const math = extractMathSegments(code.text);
  const html = renderMathSegments(
    textBlocksToRichText(math.text),
    math.segments,
  );
  return restoreCodeSegments(html, code.segments);
}

/** Convert math delimiters in a text node while preserving its exact spacing.
 * @example mathTextToRichText(" $x$ ");
 */
export function mathTextToRichText(value: string): string {
  const { text, segments } = extractMathSegments(value);
  return renderMathSegments(escapeHtml(text), segments);
}
