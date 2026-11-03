"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getNoteDetailHref } from "@/lib/navigation/detail-page-back-link";
import { fetchNoteConnections } from "@/lib/read-api/documents";

/**
 * Links in and out of a note. Always refetches on mount, because other notes
 * can gain or lose links to this one between visits.
 *
 * @example const connections = useNoteConnections(note.id);
 */
export function useNoteConnections(noteId: string) {
  return useQuery({
    queryKey: ["note-connections", noteId],
    queryFn: () => fetchNoteConnections(noteId),
    staleTime: 0,
  });
}

interface NoteLinkedFromProps {
  connections: ReturnType<typeof useNoteConnections>;
}

export function NoteLinkedFrom({ connections }: Readonly<NoteLinkedFromProps>) {
  if (connections.isError) {
    return (
      <p className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
        Couldn't load linked notes.
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs"
          onClick={() => void connections.refetch()}
        >
          Retry
        </Button>
      </p>
    );
  }

  const backlinks = connections.data?.backlinks ?? [];
  if (backlinks.length === 0) return null;

  return (
    <section aria-labelledby="note-linked-from" className="shrink-0 space-y-2">
      <h2
        id="note-linked-from"
        className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
      >
        Linked from
      </h2>
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {backlinks.map((backlink) => (
          <li key={backlink.id} className="min-w-0">
            <Link
              href={getNoteDetailHref(backlink.subjectId, backlink.id)}
              className="block truncate text-sm text-primary underline-offset-4 hover:underline"
            >
              {backlink.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
