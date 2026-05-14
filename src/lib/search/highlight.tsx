import type { ReactNode } from "react";

export interface SearchHighlightSegment {
  text: string;
  highlighted: boolean;
  offset: number;
}

const SEARCH_SNIPPET_ELLIPSIS = "...";

/** Splits text into literal display segments for case-insensitive highlighting. */
export function splitSearchHighlightSegments(
  value: string,
  query: string,
): SearchHighlightSegment[] {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length === 0) {
    return [{ text: value, highlighted: false, offset: 0 }];
  }

  return collectSearchHighlightSegments(value, normalizedQuery);
}

/** Renders highlighted text without raw HTML injection. */
export function renderSearchHighlightedText(
  value: string,
  query: string,
): ReactNode {
  return splitSearchHighlightSegments(value, query).map((segment) =>
    segment.highlighted ? (
      <mark
        className="rounded-sm px-0.5"
        data-search-highlight="true"
        key={segment.offset}
      >
        {segment.text}
      </mark>
    ) : (
      segment.text
    ),
  );
}

/** Builds a plain-text preview that keeps the matching phrase visible. */
export function buildSearchMatchSnippet(
  value: string,
  query: string,
  maxLength: number,
): string {
  const normalizedQuery = query.trim();
  const matchIndex = value.toLowerCase().indexOf(normalizedQuery.toLowerCase());

  if (normalizedQuery.length === 0 || matchIndex === -1) {
    return truncateSearchSnippetEnd(value, maxLength);
  }

  return sliceSearchMatchSnippet(value, normalizedQuery, matchIndex, maxLength);
}

function collectSearchHighlightSegments(
  value: string,
  query: string,
): SearchHighlightSegment[] {
  const lowerValue = value.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const segments: SearchHighlightSegment[] = [];
  let cursor = 0;
  let matchIndex = lowerValue.indexOf(lowerQuery);

  while (matchIndex !== -1) {
    pushSearchSegments(segments, value, cursor, matchIndex, query.length);
    cursor = matchIndex + query.length;
    matchIndex = lowerValue.indexOf(lowerQuery, cursor);
  }

  pushTrailingSearchSegment(segments, value, cursor);
  return segments;
}

function pushSearchSegments(
  segments: SearchHighlightSegment[],
  value: string,
  cursor: number,
  matchIndex: number,
  matchLength: number,
) {
  if (matchIndex > cursor) {
    segments.push({
      text: value.slice(cursor, matchIndex),
      highlighted: false,
      offset: cursor,
    });
  }

  segments.push({
    text: value.slice(matchIndex, matchIndex + matchLength),
    highlighted: true,
    offset: matchIndex,
  });
}

function pushTrailingSearchSegment(
  segments: SearchHighlightSegment[],
  value: string,
  cursor: number,
) {
  if (cursor < value.length) {
    segments.push({
      text: value.slice(cursor),
      highlighted: false,
      offset: cursor,
    });
  }
}

function truncateSearchSnippetEnd(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trimEnd()}${SEARCH_SNIPPET_ELLIPSIS}`;
}

function sliceSearchMatchSnippet(
  value: string,
  query: string,
  matchIndex: number,
  maxLength: number,
): string {
  const snippetLength = Math.max(maxLength, query.length);
  const leadingRoom = Math.floor((snippetLength - query.length) / 2);
  const start = Math.max(0, matchIndex - leadingRoom);
  const end = Math.min(value.length, start + snippetLength);
  const prefix = start > 0 ? SEARCH_SNIPPET_ELLIPSIS : "";
  const suffix = end < value.length ? SEARCH_SNIPPET_ELLIPSIS : "";

  return `${prefix}${value.slice(start, end).trim()}${suffix}`;
}
