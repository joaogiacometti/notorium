"use client";

import { FileText, Layers } from "lucide-react";
import { CommandGroup, CommandItem } from "@/components/ui/command";
import { LIMITS } from "@/lib/config/limits";
import { richTextToPlainText } from "@/lib/editor/rich-text";
import {
  getFlashcardDetailHref,
  getNoteDetailHref,
} from "@/lib/navigation/detail-page-back-link";
import {
  buildSearchMatchSnippet,
  renderSearchHighlightedText,
} from "@/lib/search/highlight";
import type { SearchData } from "@/lib/server/api-contracts";

type SearchNote = SearchData["notes"][number];
type SearchFlashcard = SearchData["flashcards"][number];

const RESULT_ITEM_CLASS =
  "flex cursor-pointer flex-col items-start gap-1 transition-colors";
const SUBJECT_LABEL_CLASS =
  "flex min-w-0 max-w-[45%] items-center gap-1 overflow-hidden text-xs text-muted-foreground";

interface NoteResultGroupProps {
  notes: SearchNote[];
  heading: string;
  highlightQuery: string;
  onSelect: (href: string) => void;
}

export function NoteResultGroup({
  notes,
  heading,
  highlightQuery,
  onSelect,
}: Readonly<NoteResultGroupProps>) {
  if (notes.length === 0) {
    return null;
  }
  return (
    <CommandGroup heading={heading}>
      {notes.map((n) => (
        <CommandItem
          key={n.id}
          value={n.id}
          onSelect={() => onSelect(getNoteDetailHref(n.subjectId, n.id))}
          className={RESULT_ITEM_CLASS}
        >
          <div className="flex w-full min-w-0 items-center gap-2">
            <FileText className="!size-4 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">
              {renderSearchHighlightedText(n.title, highlightQuery)}
            </span>
            <span className={SUBJECT_LABEL_CLASS}>
              <span className="shrink-0">in</span>
              <span className="block min-w-0 flex-1 truncate">
                {renderSearchHighlightedText(n.subjectName, highlightQuery)}
              </span>
            </span>
          </div>
          {n.content && (
            <ResultSnippet
              text={richTextToPlainText(n.content)}
              highlightQuery={highlightQuery}
              maxLength={LIMITS.contentPreviewTruncate}
            />
          )}
        </CommandItem>
      ))}
    </CommandGroup>
  );
}

interface FlashcardResultGroupProps {
  flashcards: SearchFlashcard[];
  heading: string;
  highlightQuery: string;
  detailOptions: Parameters<typeof getFlashcardDetailHref>[1];
  onSelect: (href: string) => void;
}

export function FlashcardResultGroup({
  flashcards,
  heading,
  highlightQuery,
  detailOptions,
  onSelect,
}: Readonly<FlashcardResultGroupProps>) {
  if (flashcards.length === 0) {
    return null;
  }
  return (
    <CommandGroup heading={heading}>
      {flashcards.map((fc) => (
        <CommandItem
          key={fc.id}
          value={fc.id}
          onSelect={() =>
            onSelect(getFlashcardDetailHref(fc.id, detailOptions))
          }
          className={RESULT_ITEM_CLASS}
        >
          <div className="flex w-full min-w-0 items-center gap-2">
            <Layers className="!size-4 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">
              <ResultSnippet
                text={richTextToPlainText(fc.front)}
                highlightQuery={highlightQuery}
                maxLength={80}
                bare
              />
            </span>
            <span className={SUBJECT_LABEL_CLASS}>
              <span className="shrink-0">in</span>
              <span className="block flex-1 truncate">{fc.subjectPath}</span>
            </span>
          </div>
          {fc.back && (
            <ResultSnippet
              text={richTextToPlainText(fc.back)}
              highlightQuery={highlightQuery}
              maxLength={120}
            />
          )}
        </CommandItem>
      ))}
    </CommandGroup>
  );
}

interface ResultSnippetProps {
  text: string;
  highlightQuery: string;
  maxLength: number;
  bare?: boolean;
}

function ResultSnippet({
  text,
  highlightQuery,
  maxLength,
  bare = false,
}: Readonly<ResultSnippetProps>) {
  const highlighted = renderSearchHighlightedText(
    buildSearchMatchSnippet(text, highlightQuery, maxLength),
    highlightQuery,
  );
  if (bare) {
    return highlighted;
  }
  return (
    <span className="pl-6 text-xs text-muted-foreground line-clamp-1">
      {highlighted}
    </span>
  );
}
