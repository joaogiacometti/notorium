"use client";

import { formatDistanceToNow } from "date-fns";
import { FileText, MoreVertical, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { DeleteNoteDialog } from "@/components/delete-note-dialog";
import { EditNoteDialog } from "@/components/edit-note-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NoteCardProps {
  note: {
    id: string;
    title: string;
    content: string | null;
    subjectId: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

function stripMarkdown(text: string): string {
  return text
    .replaceAll(/#{1,6}\s+/g, "")
    .replaceAll(/(\*\*|__)(.*?)\1/g, "$2")
    .replaceAll(/(\*|_)(.*?)\1/g, "$2")
    .replaceAll(/~~(.*?)~~/g, "$1")
    .replaceAll(/`{1,3}[^`]*`{1,3}/g, "")
    .replaceAll(/!\[.*?\]\(.*?\)/g, "")
    .replaceAll(/\[([^\]]*)\]\(.*?\)/g, "$1")
    .replaceAll(/^>\s+/gm, "")
    .replaceAll(/^[-*+]\s+/gm, "")
    .replaceAll(/^\d+\.\s+/gm, "")
    .replaceAll(/^---+$/gm, "")
    .replaceAll(/\n{2,}/g, " ")
    .replaceAll(/\n/g, " ")
    .trim();
}

export function NoteCard({ note }: Readonly<NoteCardProps>) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const previewText = note.content ? stripMarkdown(note.content) : null;

  return (
    <>
      <Card className="group relative transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5">
        <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
          <Link
            href={`/subjects/${note.subjectId}/notes/${note.id}`}
            className="flex min-w-0 flex-1 items-center gap-2.5"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
              <FileText className="size-4" />
            </div>
            <CardTitle className="truncate text-base leading-tight">
              {note.title}
            </CardTitle>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <Pencil className="size-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <Link href={`/subjects/${note.subjectId}/notes/${note.id}`}>
          <CardContent className="pt-0">
            {previewText && (
              <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                {previewText}
              </p>
            )}
            <p className="text-xs text-muted-foreground/60">
              Created{" "}
              {formatDistanceToNow(new Date(note.createdAt), {
                addSuffix: true,
              })}
            </p>
          </CardContent>
        </Link>
      </Card>

      <EditNoteDialog note={note} open={editOpen} onOpenChange={setEditOpen} />
      <DeleteNoteDialog
        noteId={note.id}
        noteTitle={note.title}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}
