const LABEL_PREFIX_RE = /^(Back:|Answer:|Definition:|Response:|Improved:)\s*/i;

const PROSE_HEADER_RE =
  /^(Here (?:are|is)\s+(?:the\s+)?(?:key\s+)?(?:points?|answer)|Key points?|Summary|Definition)\s*:\s*\n(?=(?:[-*]\s+|\d+\.\s+))/i;

const INLINE_BULLET_RE = /(?<!\n) - /g;
const LINE_BREAK_BULLET_RE = / -[ \t]*\n(?=\S)/g;
const DANGLING_BULLET_RE = / -[ \t]*(?=\n\s*\n|$)/g;

export function normalizeGeneratedBack(value: string): string {
  let normalized = value.replaceAll("\r\n", "\n").trim();

  let prev: string;
  do {
    prev = normalized;
    normalized = normalized.replace(LABEL_PREFIX_RE, "").trim();
  } while (normalized !== prev);

  normalized = normalized.replace(PROSE_HEADER_RE, "").trim();
  normalized = normalized.replace(LINE_BREAK_BULLET_RE, "\n- ");
  normalized = normalized.replace(DANGLING_BULLET_RE, "");
  normalized = normalized.replace(INLINE_BULLET_RE, "\n- ");

  return normalized;
}
