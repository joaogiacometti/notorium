/**
 * Cloze deletion parsing and rendering.
 *
 * A cloze "note" is a single rich-text source string containing one or more
 * deletion markers of the form `{{c1::answer}}` or `{{c1::answer::hint}}`. Each
 * distinct ordinal (`c1`, `c2`, ...) becomes its own scheduled sibling card.
 *
 * Markers are authored as plain inline text inside the editor HTML, so all
 * rendering here is plain regex substitution over the HTML string. The revealed
 * answer and the active blank are wrapped in `<mark>` so the shared Tiptap
 * renderer (which loads `@tiptap/extension-highlight`) styles them via theme
 * CSS variables rather than hardcoded colors.
 */

// Matches a single deletion. Group 1 is the ordinal, group 2 is everything up to
// the closing `}}` (answer plus optional `::hint`). The inner pattern refuses to
// cross a `}}` so adjacent markers do not merge.
const CLOZE_MARKER_PATTERN = /\{\{c(\d+)::((?:(?!\}\})[\s\S])*)\}\}/g;

interface ClozeMarkerParts {
  ordinal: number;
  answer: string;
  hint: string | null;
}

function splitClozeContent(content: string): {
  answer: string;
  hint: string | null;
} {
  const separatorIndex = content.indexOf("::");
  if (separatorIndex === -1) {
    return { answer: content, hint: null };
  }
  return {
    answer: content.slice(0, separatorIndex),
    hint: content.slice(separatorIndex + 2),
  };
}

function parseMarker(rawOrdinal: string, content: string): ClozeMarkerParts {
  const { answer, hint } = splitClozeContent(content);
  return { ordinal: Number.parseInt(rawOrdinal, 10), answer, hint };
}

/**
 * Returns true when the source contains at least one well-formed cloze marker.
 *
 * @example
 * hasClozeMarkers("The capital is {{c1::Paris}}."); // true
 */
export function hasClozeMarkers(source: string): boolean {
  CLOZE_MARKER_PATTERN.lastIndex = 0;
  return CLOZE_MARKER_PATTERN.test(source);
}

/**
 * Returns the distinct cloze ordinals in ascending order. Each ordinal maps to
 * one sibling card.
 *
 * @example
 * parseClozeOrdinals("{{c2::b}} then {{c1::a}} and {{c1::z}}"); // [1, 2]
 */
export function parseClozeOrdinals(source: string): number[] {
  const ordinals = new Set<number>();
  CLOZE_MARKER_PATTERN.lastIndex = 0;
  for (const match of source.matchAll(CLOZE_MARKER_PATTERN)) {
    const ordinal = Number.parseInt(match[1], 10);
    if (ordinal > 0) {
      ordinals.add(ordinal);
    }
  }
  return [...ordinals].sort((a, b) => a - b);
}

function blankFor(parts: ClozeMarkerParts): string {
  const label = parts.hint && parts.hint.length > 0 ? parts.hint : "...";
  return `<mark>[${label}]</mark>`;
}

/**
 * Renders the front of the sibling card for `targetOrdinal`: that ordinal's
 * deletions become a highlighted blank, every other deletion shows its answer.
 *
 * @example
 * renderClozeFront("{{c1::Paris}} in {{c2::France}}", 1);
 * // "<mark>[...]</mark> in France"
 */
export function renderClozeFront(
  source: string,
  targetOrdinal: number,
): string {
  return source.replace(CLOZE_MARKER_PATTERN, (_full, rawOrdinal, content) => {
    const parts = parseMarker(rawOrdinal, content);
    return parts.ordinal === targetOrdinal ? blankFor(parts) : parts.answer;
  });
}

/**
 * Renders the back of the sibling card for `targetOrdinal`: that ordinal's
 * deletions reveal a highlighted answer, every other deletion shows its answer.
 *
 * @example
 * renderClozeBack("{{c1::Paris}} in {{c2::France}}", 1);
 * // "<mark>Paris</mark> in France"
 */
export function renderClozeBack(source: string, targetOrdinal: number): string {
  return source.replace(CLOZE_MARKER_PATTERN, (_full, rawOrdinal, content) => {
    const parts = parseMarker(rawOrdinal, content);
    return parts.ordinal === targetOrdinal
      ? `<mark>${parts.answer}</mark>`
      : parts.answer;
  });
}

/**
 * Strips all marker syntax to the bare answer text. Used to build the
 * normalized/searchable representation of a cloze source.
 *
 * @example
 * stripClozeMarkers("{{c1::Paris}} in {{c2::France}}"); // "Paris in France"
 */
export function stripClozeMarkers(source: string): string {
  return source.replace(CLOZE_MARKER_PATTERN, (_full, _ordinal, content) => {
    return splitClozeContent(content).answer;
  });
}
