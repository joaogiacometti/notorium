"use client";

import {
  PdfAnnotationSubtype,
  type PdfHighlightAnnoObject,
} from "@embedpdf/models";
import type { TrackedAnnotation } from "@embedpdf/plugin-annotation";
import { useAnnotation } from "@embedpdf/plugin-annotation/react";
import { useScroll } from "@embedpdf/plugin-scroll/react";
import type { ReactNode } from "react";
import { HIGHLIGHT_CATEGORY } from "@/components/library/book-reader-annotation-config";
import { useReaderNavHistory } from "@/components/library/book-reader-nav-history";
import type { BookAnnotationDto } from "@/features/library-annotations/types";
import { cn } from "@/lib/utils";

interface ReaderHighlightsProps {
  documentId: string;
  initialAnnotations: BookAnnotationDto[];
}

interface HighlightListItem {
  id: string;
  pageIndex: number;
  note: string;
  rect: PdfHighlightAnnoObject["rect"];
}

/**
 * Lists the user's live reader highlights and lets them jump back to each
 * annotation.
 *
 * @example
 * <ReaderHighlights documentId={documentId} />
 */
export function ReaderHighlights({
  documentId,
  initialAnnotations,
}: Readonly<ReaderHighlightsProps>) {
  const { provides: annotationApi, state } = useAnnotation(documentId);
  const { provides: scroll } = useScroll(documentId);
  const history = useReaderNavHistory();
  const initialHighlightIds = new Set(
    initialAnnotations.map((annotation) => annotation.uid),
  );
  const highlights = getHighlightItems(state.byUid, initialHighlightIds);

  if (!annotationApi) {
    return <HighlightsMessage>Loading highlights…</HighlightsMessage>;
  }
  if (highlights.length === 0) {
    return <HighlightsMessage>This book has no highlights.</HighlightsMessage>;
  }

  return (
    <nav aria-label="Highlights" className="h-full overflow-y-auto p-2">
      <ul className="space-y-1">
        {highlights.map((highlight) => (
          <HighlightEntry
            key={highlight.id}
            highlight={highlight}
            isSelected={state.selectedUids.includes(highlight.id)}
            onSelect={() => {
              history.recordCurrentView();
              scroll?.scrollToPage({
                pageNumber: highlight.pageIndex + 1,
                pageCoordinates: highlight.rect.origin,
                alignY: 30,
                behavior: "instant",
              });
              annotationApi.selectAnnotation(highlight.pageIndex, highlight.id);
            }}
          />
        ))}
      </ul>
    </nav>
  );
}

function getHighlightItems(
  annotations: Record<string, TrackedAnnotation>,
  initialHighlightIds: ReadonlySet<string>,
): HighlightListItem[] {
  return Object.values(annotations)
    .filter((entry) => isUserHighlight(entry, initialHighlightIds))
    .map((entry) => ({
      id: entry.object.id,
      pageIndex: entry.object.pageIndex,
      note: (entry.object.contents ?? "").trim(),
      rect: entry.object.rect,
    }))
    .sort(compareHighlights);
}

function isUserHighlight(
  entry: TrackedAnnotation,
  initialHighlightIds: ReadonlySet<string>,
): entry is TrackedAnnotation<PdfHighlightAnnoObject> {
  return (
    entry.object.type === PdfAnnotationSubtype.HIGHLIGHT &&
    entry.commitState !== "deleted" &&
    (initialHighlightIds.has(entry.object.id) || isTaggedUserHighlight(entry))
  );
}

function isTaggedUserHighlight(entry: TrackedAnnotation): boolean {
  return entry.object.custom?.category === HIGHLIGHT_CATEGORY;
}

function compareHighlights(
  first: HighlightListItem,
  second: HighlightListItem,
): number {
  return (
    first.pageIndex - second.pageIndex ||
    first.rect.origin.y - second.rect.origin.y ||
    first.rect.origin.x - second.rect.origin.x ||
    first.id.localeCompare(second.id)
  );
}

interface HighlightEntryProps {
  highlight: HighlightListItem;
  isSelected: boolean;
  onSelect: () => void;
}

function HighlightEntry({
  highlight,
  isSelected,
  onSelect,
}: Readonly<HighlightEntryProps>) {
  const label =
    highlight.note || `Highlight on page ${highlight.pageIndex + 1}`;

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={isSelected ? "true" : undefined}
        className={cn(
          "w-full rounded px-2 py-1.5 text-left transition-colors",
          isSelected
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        )}
      >
        <span className="block text-xs font-medium text-foreground">
          Page {highlight.pageIndex + 1}
        </span>
        <span className="line-clamp-3 break-words text-sm">{label}</span>
      </button>
    </li>
  );
}

function HighlightsMessage({ children }: Readonly<{ children: ReactNode }>) {
  return <p className="p-4 text-sm text-muted-foreground">{children}</p>;
}
