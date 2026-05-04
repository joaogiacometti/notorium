"use client";

import {
  ArrowLeft,
  Clipboard,
  FileText,
  MoreVertical,
  Pencil,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { DeleteNoteDialog } from "@/components/notes/delete-note-dialog";
import { GenerateNoteFlashcardsDialog } from "@/components/notes/generate-note-flashcards-dialog";
import { LazyEditNoteDialog as EditNoteDialog } from "@/components/notes/lazy-edit-note-dialog";
import { DetailPageLayout } from "@/components/shared/detail-page-layout";
import { LazyTiptapRenderer as TiptapRenderer } from "@/components/shared/lazy-tiptap-renderer";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  copyNoteContentToClipboard,
  type NoteCopyFormat,
} from "@/lib/clipboard/note-content";
import { formatRelativeTime } from "@/lib/dates/format";
import type { DeckOption, NoteEntity } from "@/lib/server/api-contracts";

interface NoteDetailProps {
  aiEnabled: boolean;
  backHref: string;
  backLabel: string;
  decks: DeckOption[];
  note: NoteEntity;
}

export function NoteDetail({
  aiEnabled,
  backHref,
  backLabel,
  decks,
  note,
}: Readonly<NoteDetailProps>) {
  const router = useRouter();
  const [, startNavTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const hasDecks = decks.length > 0;
  const noteContent = note.content ?? "";
  const hasContent = noteContent.trim().length > 0;

  async function copyNoteContent(format: NoteCopyFormat) {
    try {
      await copyNoteContentToClipboard(noteContent, format);
      toast.success("Note copied.");
    } catch {
      toast.error("Could not copy note.");
    }
  }

  return (
    <DetailPageLayout
      actions={
        <>
          {aiEnabled ? (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5 sm:flex-none"
              onClick={() => setGenerateOpen(true)}
              disabled={!hasDecks}
              title={
                hasDecks
                  ? undefined
                  : "Create a deck before generating flashcards."
              }
            >
              <Sparkles className="size-3.5" />
              Generate flashcards
            </Button>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon-sm"
                className="shrink-0"
                aria-label="Open note actions"
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {hasContent ? (
                <>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => void copyNoteContent("rich")}
                  >
                    <Clipboard className="size-4" />
                    Copy as rich text
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => void copyNoteContent("plain")}
                  >
                    <Clipboard className="size-4" />
                    Copy as plain text
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              ) : null}
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="size-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      }
      backHref={backHref}
      backIcon={ArrowLeft}
      backLabel={backLabel}
      meta={<span>Created {formatRelativeTime(note.createdAt)}</span>}
      title={note.title}
      titleIcon={FileText}
    >
      <div className="min-w-0 overflow-hidden rounded-xl border border-border/60 bg-card p-4 sm:p-6">
        <div className="min-w-0 space-y-4 sm:space-y-5">
          {hasContent ? (
            <TiptapRenderer
              content={noteContent}
              className="min-w-0 wrap-break-word hyphens-auto text-sm sm:text-base"
            />
          ) : (
            <p className="text-sm italic text-muted-foreground sm:text-base">
              No content yet. Click Edit to add some notes.
            </p>
          )}
        </div>
      </div>

      <EditNoteDialog
        note={note}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={() => {
          router.refresh();
        }}
      />
      <DeleteNoteDialog
        noteId={note.id}
        noteTitle={note.title}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onSuccess={() => {
          setDeleteOpen(false);
          startNavTransition(() => router.push(backHref));
        }}
      />
      {aiEnabled ? (
        <GenerateNoteFlashcardsDialog
          decks={decks}
          noteId={note.id}
          open={generateOpen}
          onOpenChange={setGenerateOpen}
        />
      ) : null}
    </DetailPageLayout>
  );
}
