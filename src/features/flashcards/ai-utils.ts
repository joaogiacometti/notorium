import {
  MATH_MARKER_RE,
  plainTextToRichText,
} from "@/lib/ai/plain-text-rich-text";

const LABEL_PREFIX_RE = /^(Back:|Answer:|Definition:|Response:|Improved:)\s*/i;

const PROSE_HEADER_RE =
  /^(Here (?:are|is)\s+(?:the\s+)?(?:key\s+)?(?:points?|answer)|Key points?|Summary|Definition)\s*:\s*\n(?=(?:[-*]\s+|\d+\.\s+))/i;

const INLINE_BULLET_RE = /(?<!\n) - /g;
const LINE_BREAK_BULLET_RE = / -[ \t]*\n(?=\S)/g;
const DANGLING_BULLET_RE = / -[ \t]*(?=\n\s*\n|$)/g;

// Fenced code, math, and inline code keep their dashes: a " - " inside them is
// a minus sign or code, never a bullet separator.
const LITERAL_SPAN_RE = new RegExp(
  ["```[\\s\\S]*?```", MATH_MARKER_RE.source, "`[^`\\n]+`"].join("|"),
  "g",
);
// Plain alphanumerics, so the layout regexes treat a span as one word.
const LITERAL_SPAN_TOKEN_RE = /LITERALSPAN(\d+)END/g;

/**
 * Clean a generated back: drop answer labels and list prefaces, and turn
 * inline " - " separators into bullet lines, leaving math and code untouched.
 *
 * @example
 * normalizeGeneratedBack("Answer: - Gain - Uses $a - b$"); // "- Gain\n- Uses $a - b$"
 */
export function normalizeGeneratedBack(value: string): string {
  const { text, spans } = shieldLiteralSpans(
    value.replaceAll("\r\n", "\n").trim(),
  );
  return restoreLiteralSpans(normalizeBackLayout(text), spans);
}

function shieldLiteralSpans(value: string): { text: string; spans: string[] } {
  const spans: string[] = [];
  const text = value.replace(LITERAL_SPAN_RE, (span) => {
    spans.push(span);
    return `LITERALSPAN${spans.length - 1}END`;
  });
  return { text, spans };
}

function restoreLiteralSpans(value: string, spans: string[]): string {
  return value.replace(
    LITERAL_SPAN_TOKEN_RE,
    (token, index: string) => spans[Number(index)] ?? token,
  );
}

function normalizeBackLayout(value: string): string {
  let normalized = value;
  let prev: string;
  do {
    prev = normalized;
    normalized = normalized.replace(LABEL_PREFIX_RE, "").trim();
  } while (normalized !== prev);

  normalized = normalized.replace(PROSE_HEADER_RE, "").trim();
  normalized = normalized.replace(LINE_BREAK_BULLET_RE, "\n- ");
  normalized = normalized.replace(DANGLING_BULLET_RE, "");
  return normalized.replace(INLINE_BULLET_RE, "\n- ");
}

const BULLET_LINE_RE = /^[-*]\s+/;

/**
 * Generated cards as rich text: empty cards dropped, backs normalized, and a
 * back whose later lines are bullets gets its first line bulleted too.
 *
 * @example
 * normalizeGeneratedCards({ cards: [{ front: "What is ATP?", back: "- Energy carrier" }] });
 */
export function normalizeGeneratedCards(output: {
  cards: Array<{ front: string; back: string }>;
}): Array<{ front: string; back: string }> {
  return output.cards.flatMap((card) => {
    const front = card.front.trim();
    const back = card.back.trim();
    if (front.length === 0 || back.length === 0) {
      return [];
    }

    return [
      {
        front: plainTextToRichText(front),
        back: plainTextToRichText(
          withConsistentBullets(normalizeGeneratedBack(back)),
        ),
      },
    ];
  });
}

function withConsistentBullets(back: string): string {
  const [firstLine = "", ...rest] = back.split("\n");
  const hasBulletLines = rest.some((line) => BULLET_LINE_RE.test(line.trim()));
  const first = firstLine.trim();
  if (!hasBulletLines || first.length === 0 || BULLET_LINE_RE.test(first)) {
    return back;
  }

  return `- ${first}\n${rest.join("\n")}`;
}
