function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeLine(value: string) {
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

type BlockType = "bullet" | "ordered" | "paragraph";

function classifyLines(lines: string[]): BlockType {
  const isBullet = lines.every((line) => /^[-*]\s+/.test(line));
  if (isBullet) return "bullet";

  const isOrdered = lines.every((line) => /^\d+\.\s+/.test(line));
  if (isOrdered) return "ordered";

  return "paragraph";
}

export function plainTextToRichText(value: string): string {
  const blocks = value
    .replaceAll("\r\n", "\n")
    .split(/\n\s*\n/g)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);

  if (blocks.length === 0) {
    return "";
  }

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
