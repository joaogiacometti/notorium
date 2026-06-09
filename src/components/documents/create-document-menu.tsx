"use client";

import { FileText, Plus, Workflow } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CreateMindmapDialog } from "@/components/mindmaps/create-mindmap-dialog";
import { CreateNoteTitleDialog } from "@/components/notes/create-note-title-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LIMITS } from "@/lib/config/limits";
import {
  getMindmapDetailHref,
  getNoteDetailHref,
} from "@/lib/navigation/detail-page-back-link";

interface CreateDocumentMenuProps {
  subjectId: string;
  noteCount: number;
  mindmapCount: number;
  size?: "sm" | "default";
}

/**
 * Single "Create" entry point for the documents area: a note or a mindmap.
 *
 * @example
 * <CreateDocumentMenu subjectId={subject.id} noteCount={3} mindmapCount={1} />
 */
export function CreateDocumentMenu({
  subjectId,
  noteCount,
  mindmapCount,
  size = "sm",
}: Readonly<CreateDocumentMenuProps>) {
  const router = useRouter();
  const [, startNavTransition] = useTransition();
  const [noteOpen, setNoteOpen] = useState(false);
  const [mindmapOpen, setMindmapOpen] = useState(false);
  const atNoteLimit = noteCount >= LIMITS.maxNotesPerSubject;
  const atMindmapLimit = mindmapCount >= LIMITS.maxMindmapsPerSubject;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size={size}
            className="gap-1.5 whitespace-nowrap"
            aria-label="Create document"
          >
            <Plus className="size-4" />
            <span>Create</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="cursor-pointer"
            disabled={atNoteLimit}
            title={
              atNoteLimit
                ? "Delete an existing note to create a new one."
                : undefined
            }
            onSelect={() => setNoteOpen(true)}
          >
            <FileText className="size-4" />
            Note
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer"
            disabled={atMindmapLimit}
            title={
              atMindmapLimit
                ? "Delete an existing mindmap to create a new one."
                : undefined
            }
            onSelect={() => setMindmapOpen(true)}
          >
            <Workflow className="size-4" />
            Mindmap
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateNoteTitleDialog
        subjectId={subjectId}
        open={noteOpen}
        onOpenChange={setNoteOpen}
        onSuccess={(noteId) => {
          startNavTransition(() =>
            router.push(getNoteDetailHref(subjectId, noteId)),
          );
        }}
      />
      <CreateMindmapDialog
        subjectId={subjectId}
        open={mindmapOpen}
        onOpenChange={setMindmapOpen}
        onSuccess={(mindmapId) => {
          startNavTransition(() =>
            router.push(getMindmapDetailHref(subjectId, mindmapId)),
          );
        }}
      />
    </>
  );
}
