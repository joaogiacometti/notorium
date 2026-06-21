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
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onCreateChild(node.id)}>
          <FolderPlus className="size-4" />
          Subfolder
        </DropdownMenuItem>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Files className="size-4" />
            Document
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => onCreateNote(node.id)}>
              <FileText className="size-4" />
              Note
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCreateMindmap(node.id)}>
              <Workflow className="size-4" />
              Mindmap
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCreateBook(node.id)}>
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
            <DropdownMenuItem onClick={() => onCreateFlashcard(node.id)}>
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
              <DropdownMenuItem onClick={() => onCreateAssessment(node.id)}>
                <ClipboardList className="size-4" />
                Assessment
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRecordMiss(node.id)}>
                <CalendarX className="size-4" />
                Miss
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() =>
            onEdit({ id: node.id, name: node.name, kind: node.kind })
          }
        >
          <Pencil className="size-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => onDelete({ id: node.id, name: node.path })}
        >
          <Trash2 className="size-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
