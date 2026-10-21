import { FileText, Layers, type LucideIcon, Network } from "lucide-react";
import Link from "next/link";
import type { LibraryHit } from "@/features/assistant/library-search-contract";
import type { AssistantLibrarySearchPart } from "@/features/assistant/types";
import { getLibraryHitHref } from "@/features/assistant/utils";

interface AssistantLibraryResultsProps {
  search: AssistantLibrarySearchPart;
  /** Runs when a result is opened, e.g. to minimize the chat on mobile. */
  onOpenHit?: () => void;
}

const LIBRARY_HIT_KIND_DISPLAY: Record<
  LibraryHit["kind"],
  { icon: LucideIcon; label: string }
> = {
  note: { icon: FileText, label: "Note" },
  flashcard: { icon: Layers, label: "Flashcard" },
  mindmap: { icon: Network, label: "Mindmap" },
};

/**
 * Links to the notes, flashcards, and mindmaps a `searchLibrary` call found.
 * The model only summarizes; the links come from the result ids, so they
 * cannot point anywhere the search did not return.
 *
 * @example
 * <AssistantLibraryResults search={part} onOpenHit={minimizeOnMobile} />
 */
export function AssistantLibraryResults({
  search,
  onOpenHit,
}: Readonly<AssistantLibraryResultsProps>) {
  if (
    search.state === "input-streaming" ||
    search.state === "input-available"
  ) {
    return (
      <p className="text-xs text-muted-foreground">Searching your library…</p>
    );
  }

  if (search.state === "output-error") {
    return (
      <p className="text-xs text-muted-foreground">Library search failed.</p>
    );
  }

  if (search.state !== "output-available" || search.output.hits.length === 0) {
    return null;
  }

  return (
    <ul aria-label="Matches in your library" className="space-y-1">
      {search.output.hits.map((hit) => (
        <li key={`${hit.kind}:${hit.id}`}>
          <LibraryHitLink hit={hit} onOpen={onOpenHit} />
        </li>
      ))}
    </ul>
  );
}

function LibraryHitLink({
  hit,
  onOpen,
}: Readonly<{ hit: LibraryHit; onOpen?: () => void }>) {
  const { icon: Icon, label } = LIBRARY_HIT_KIND_DISPLAY[hit.kind];
  return (
    <Link
      href={getLibraryHitHref(hit)}
      onClick={onOpen}
      className="flex gap-2 rounded-lg border border-border/70 bg-background px-3 py-2 text-sm transition-colors hover:bg-muted/50"
    >
      <Icon
        aria-hidden="true"
        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">
          <span className="sr-only">{label}: </span>
          {hit.title || "Untitled"}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {hit.subjectPath}
        </span>
        {hit.snippet ? (
          <span className="line-clamp-2 text-xs text-muted-foreground">
            {hit.snippet}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
