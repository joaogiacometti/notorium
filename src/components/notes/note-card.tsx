"use client";

import { FileText, MoreVertical, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatRelativeTime } from "@/lib/dates/format";
import type { NoteEntity } from "@/lib/server/api-contracts";

interface NoteCardProps {
  note: NoteEntity;
  onEditRequested: () => void;
  onDeleteRequested: () => void;
}

export function NoteCard({
  note,
  onEditRequested,
  onDeleteRequested,
}: Readonly<NoteCardProps>) {
  return (
    <Card className="group relative min-w-0 overflow-hidden transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
        <Link
          href={`/subjects/${note.subjectId}/notes/${note.id}`}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
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
              className="size-8 shrink-0 text-muted-foreground opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 data-[state=open]:opacity-100"
              aria-label="Open note actions"
            >
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={onEditRequested}
              className="cursor-pointer"
            >
              <Pencil className="size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onDeleteRequested}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <Trash2 className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <Link
        href={`/subjects/${note.subjectId}/notes/${note.id}`}
        className="block rounded-md focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground/60">
            Created {formatRelativeTime(note.createdAt)}
          </p>
        </CardContent>
      </Link>
    </Card>
  );
}
