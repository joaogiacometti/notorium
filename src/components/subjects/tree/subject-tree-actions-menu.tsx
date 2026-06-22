"use client";

import {
  BookOpen,
  CalendarX,
  ClipboardList,
  Files,
  FileText,
  FolderPlus,
  GraduationCap,
  Layers,
  ListChecks,
  MoreHorizontal,
  Pencil,
  SquarePen,
  Trash2,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import type {
  SubjectDeleteTarget,
  SubjectEditTarget,
} from "@/components/subjects/tree/subject-tree-types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isAcademicSubject } from "@/features/subjects/constants";
import { getFlashcardsHref } from "@/lib/navigation/detail-page-back-link";
import type { SubjectTreeNode } from "@/lib/server/api-contracts";

interface SubjectActionsMenuProps {
  node: SubjectTreeNode;
  onCreateChild: (parentSubjectId: string) => void;
  onCreateAssessment: (subjectId: string) => void;
  onRecordMiss: (subjectId: string) => void;
  onCreateNote: (subjectId: string) => void;
  onCreateMindmap: (subjectId: string) => void;
  onCreateBook: (subjectId: string) => void;
  onCreateFlashcard: (subjectId: string) => void;
  onEdit: (subject: SubjectEditTarget) => void;
  onDelete: (subject: SubjectDeleteTarget) => void;
}

/**
 * The per-subject kebab menu in the tree row. Create actions are grouped by kind
 * — Document, Flashcards, and (for academic subjects) Academics — alongside
 * Subfolder, edit, and delete.
 */
export function SubjectActionsMenu({
  node,
  onCreateChild,
  onCreateAssessment,
  onRecordMiss,
  onCreateNote,
  onCreateMindmap,
  onCreateBook,
  onCreateFlashcard,
  onEdit,
  onDelete,
}: Readonly<SubjectActionsMenuProps>) {
  // Each create/edit item opens a dialog. Defer the dialog open until the menu
  // has fully closed: while the dropdown plays its close animation it still
  // traps focus, so opening the dialog now would let that trap steal focus back
  // from the dialog's autofocused input. Running the action in onCloseAutoFocus
  // (and preventing the default trigger refocus) opens the dialog only once the
  // menu is gone, so its input keeps focus.
  const pendingActionRef = useRef<(() => void) | null>(null);
  function openDialog(action: () => void) {
    pendingActionRef.current = action;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
          aria-label={`Actions for ${node.name}`}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onCloseAutoFocus={(event) => {
          const action = pendingActionRef.current;
          if (action) {
            pendingActionRef.current = null;
            event.preventDefault();
            action();
          }
        }}
      >
        <DropdownMenuItem
          onClick={() => openDialog(() => onCreateChild(node.id))}
        >
          <FolderPlus className="size-4" />
          Subfolder
        </DropdownMenuItem>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Files className="size-4" />
            Document
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem
              onClick={() => openDialog(() => onCreateNote(node.id))}
            >
              <FileText className="size-4" />
              Note
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => openDialog(() => onCreateMindmap(node.id))}
            >
              <Workflow className="size-4" />
              Mindmap
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => openDialog(() => onCreateBook(node.id))}
            >
              <BookOpen className="size-4" />
              Book
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Layers className="size-4" />
            Flashcards
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem
              onClick={() => openDialog(() => onCreateFlashcard(node.id))}
            >
              <SquarePen className="size-4" />
              Add flashcard
            </DropdownMenuItem>
            {node.dueFlashcardCount > 0 && (
              <DropdownMenuItem asChild>
                <Link
                  href={getFlashcardsHref("review", node.id, { focus: true })}
                >
                  <GraduationCap className="size-4" />
                  Review flashcards
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <Link href={getFlashcardsHref("manage", node.id)}>
                <ListChecks className="size-4" />
                Manage flashcards
              </Link>
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {isAcademicSubject(node.kind) && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <GraduationCap className="size-4" />
              Academics
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                onClick={() => openDialog(() => onCreateAssessment(node.id))}
              >
                <ClipboardList className="size-4" />
                Assessment
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => openDialog(() => onRecordMiss(node.id))}
              >
                <CalendarX className="size-4" />
                Miss
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() =>
            openDialog(() =>
              onEdit({ id: node.id, name: node.name, kind: node.kind }),
            )
          }
        >
          <Pencil className="size-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() =>
            openDialog(() => onDelete({ id: node.id, name: node.path }))
          }
        >
          <Trash2 className="size-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
