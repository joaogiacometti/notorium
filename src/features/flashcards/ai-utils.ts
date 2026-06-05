function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function normalizeLine(value: string) {
  return value.replaceAll(/\s+/g, " ").trim();
}

const LABEL_PREFIX_RE = /^(Back:|Answer:|Definition:|Response:|Improved:)\s*/i;

const PROSE_HEADER_RE =
  /^(Here (?:are|is)\s+(?:the\s+)?(?:key\s+)?(?:points?|answer)|Key points?|Summary|Definition)\s*:\s*\n(?=(?:[-*]\s+|\d+\.\s+))/i;

const INLINE_BULLET_RE = /(?<!\n) - /g;

export function normalizeGeneratedBack(value: string): string {
  let normalized = value.replaceAll("\r\n", "\n").trim();

  let prev: string;
  do {
    prev = normalized;
    normalized = normalized.replace(LABEL_PREFIX_RE, "").trim();
  } while (normalized !== prev);

  normalized = normalized.replace(PROSE_HEADER_RE, "").trim();
  normalized = normalized.replace(INLINE_BULLET_RE, "\n- ");

  return normalized;
}

type MathSegment = { token: string; type: "inline" | "block"; latex: string };

// `$$...$$` (block) is tried before `$...$` (inline) via alternation order.
const MATH_MARKER_RE = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
// Bare numbers/currency such as `$100$` are not math.
const CURRENCY_LIKE_RE = /^[\d.,\s]+$/;

// Pull math out before line processing so escaping/classification cannot corrupt
// the LaTeX, then reinsert math nodes after the HTML skeleton is built. Tokens
// are plain alphanumerics so normalizeLine, escapeHtml, and classifyLines leave
// them untouched.
function extractMathSegments(value: string): {
  text: string;
  segments: MathSegment[];
} {
  const segments: MathSegment[] = [];
  const text = value.replace(
    MATH_MARKER_RE,
    (match, blockLatex?: string, inlineLatex?: string) => {
      const isBlock = typeof blockLatex === "string";
      const latex = (isBlock ? blockLatex : inlineLatex)?.trim() ?? "";
      if (latex.length === 0) return match;
      if (!isBlock && CURRENCY_LIKE_RE.test(latex)) return match;

      const token = `MATHMARKER${segments.length}END`;
      segments.push({ token, type: isBlock ? "block" : "inline", latex });
      return token;
    },
  );

  return { text, segments };
}

function renderMathSegments(html: string, segments: MathSegment[]): string {
  let result = html;
  for (const segment of segments) {
    if (segment.type === "block") {
      const block = `<div data-type="block-math" data-latex="${escapeHtml(segment.latex)}"></div>`;
      result = result
        .replaceAll(`<p>${segment.token}</p>`, block)
        .replaceAll(segment.token, block);
    } else {
      const inline = `<span data-type="inline-math" data-latex="${escapeHtml(segment.latex)}"></span>`;
      result = result.replaceAll(segment.token, inline);
    }
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

export function plainTextToRichText(value: string): string {
  const { text, segments } = extractMathSegments(value);

  const blocks = text
    .replaceAll("\r\n", "\n")
    .split(/\n\s*\n/g)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);

  if (blocks.length === 0) {
    return "";
  }

  const html = blocks
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

  return renderMathSegments(html, segments);
}
