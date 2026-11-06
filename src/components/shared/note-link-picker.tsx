"use client";

import { useQuery } from "@tanstack/react-query";
import type { SuggestionProps } from "@tiptap/suggestion";
import { type RefObject, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { libraryKeys } from "@/lib/client-cache/queries";
import { LIMITS } from "@/lib/config/limits";
import type {
  NoteLinkChoice,
  NoteLinkSuggestionRender,
} from "@/lib/editor/tiptap-note-link-suggestion";
import { useDebouncedValue } from "@/lib/react/use-debounced-value";
import { fetchSearchData } from "@/lib/read-api/search";
import { cn } from "@/lib/utils";

export interface NoteLinkPickerSession {
  query: string;
  getAnchorRect: () => DOMRect | null;
  choose: (choice: NoteLinkChoice) => void;
}

type PickerKeyHandler = (event: KeyboardEvent) => boolean;

/**
 * Connects the `[[` suggestion lifecycle to React state. The returned `render`
 * is captured once by the editor, so it only touches stable state setters and refs.
 */
export function useNoteLinkPicker() {
  const [session, setSession] = useState<NoteLinkPickerSession | null>(null);
  const keyHandlerRef = useRef<PickerKeyHandler | null>(null);

  const render: NoteLinkSuggestionRender = () => {
    const open = (props: SuggestionProps<NoteLinkChoice, NoteLinkChoice>) => {
      setSession({
        query: props.query,
        getAnchorRect: () => props.clientRect?.() ?? null,
        choose: props.command,
      });
    };
    return {
      onStart: open,
      onUpdate: open,
      onKeyDown: ({ event }) => keyHandlerRef.current?.(event) ?? false,
      onExit: () => setSession(null),
    };
  };

  return { render, session, keyHandlerRef, dismiss: () => setSession(null) };
}

interface NoteLinkPickerProps {
  session: NoteLinkPickerSession;
  /** The note being edited, which shouldn't offer a link to itself. */
  currentNoteId: string;
  keyHandlerRef: RefObject<PickerKeyHandler | null>;
  onDismiss: () => void;
}

export function NoteLinkPicker({
  session,
  currentNoteId,
  keyHandlerRef,
  onDismiss,
}: Readonly<NoteLinkPickerProps>) {
  const typedQuery = session.query.trim();
  const debouncedQuery = useDebouncedValue(typedQuery, 200);
  const canSearch = debouncedQuery.length >= LIMITS.searchQueryMin;
  const search = useQuery({
    queryKey: [...libraryKeys.search, "note-links", debouncedQuery],
    queryFn: () => fetchSearchData(debouncedQuery),
    enabled: canSearch,
    placeholderData: (previousData) => previousData,
  });
  const notes = canSearch
    ? (search.data?.notes ?? []).filter((note) => note.id !== currentNoteId)
    : [];
  const [activeIndex, setActiveIndex] = useState(0);
  const active = Math.min(activeIndex, Math.max(notes.length - 1, 0));

  function choose(note: { id: string; title: string }) {
    session.choose({ noteId: note.id, label: note.title });
  }

  useEffect(() => {
    keyHandlerRef.current = (event) => {
      if (event.key === "Escape") {
        onDismiss();
        return true;
      }
      if (notes.length === 0) return false;
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        const step = event.key === "ArrowDown" ? 1 : -1;
        setActiveIndex((active + step + notes.length) % notes.length);
        return true;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        choose(notes[active]);
        return true;
      }
      return false;
    };
    return () => {
      keyHandlerRef.current = null;
    };
  });

  const anchor = session.getAnchorRect();

  return createPortal(
    <div
      role="listbox"
      aria-label="Link to note"
      className="fixed z-overlay w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md"
      style={{ left: anchor?.left ?? 0, top: (anchor?.bottom ?? 0) + 4 }}
    >
      {notes.length > 0 ? (
        notes.map((note, index) => (
          <button
            key={note.id}
            type="button"
            role="option"
            aria-selected={index === active}
            className={cn(
              "flex w-full flex-col gap-1 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted/50",
              index === active && "bg-muted",
            )}
            // Keep editor focus, which owns the text being replaced.
            onMouseDown={(event) => {
              event.preventDefault();
              choose(note);
            }}
          >
            <span className="truncate">{note.title}</span>
            <span className="truncate text-xs text-muted-foreground">
              {note.folderName}
            </span>
          </button>
        ))
      ) : (
        <p className="px-2 py-1.5 text-xs text-muted-foreground">
          {getPickerStatus(typedQuery, search.isError, search.isFetching)}
        </p>
      )}
    </div>,
    document.body,
  );
}

function getPickerStatus(
  query: string,
  failed: boolean,
  fetching: boolean,
): string {
  if (query.length < LIMITS.searchQueryMin) return "Type to find a note";
  if (failed) return "Couldn't search notes. Keep typing to try again.";
  return fetching ? "Searching..." : "No matching notes";
}
