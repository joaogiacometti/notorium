import type { LibraryHit } from "@/features/assistant/library-search-contract";
import { LIMITS, SUBJECT_PATH_MAX_CHARS } from "@/lib/config/limits";
import { foldSearchText } from "@/lib/search/fold";
import { buildSearchMatchSnippet } from "@/lib/search/highlight";

/** A matched row reduced to plain text, before it is cut to an excerpt. */
export interface LibraryHitSource {
  kind: LibraryHit["kind"];
  id: string;
  subjectId: string;
  title: string;
  /** Plain text the excerpt is cut from: note body, card back, node label. */
  body: string;
}

/**
 * The library hit for a matched row: title and body cut to short excerpts
 * centered on the first term they contain, so only a glimpse of each item
 * reaches the model.
 *
 * @example
 * buildLibraryHit({ kind: "note", id: "n1", subjectId: "s1", title: "Mitose", body: "..." }, ["mitose"], "Biologia");
 */
export function buildLibraryHit(
  source: LibraryHitSource,
  terms: string[],
  subjectPath: string,
): LibraryHit {
  return {
    kind: source.kind,
    id: source.id,
    subjectId: source.subjectId,
    title: buildTermExcerpt(source.title, terms),
    subjectPath: subjectPath.slice(0, SUBJECT_PATH_MAX_CHARS),
    snippet: buildTermExcerpt(source.body, terms),
  };
}

function buildTermExcerpt(value: string, terms: string[]): string {
  const text = value.replaceAll(/\s+/g, " ").trim();
  const foldedText = foldSearchText(text);
  const term = terms.find((candidate) =>
    foldedText.includes(foldSearchText(candidate)),
  );
  return buildSearchMatchSnippet(
    text,
    term ?? "",
    LIMITS.assistantLibraryExcerptMaxChars,
  );
}
