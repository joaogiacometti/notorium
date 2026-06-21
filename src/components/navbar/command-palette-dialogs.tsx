"use client";

import { CreateAssessmentDialog } from "@/components/assessments/create-assessment-dialog";
import { CreateFlashcardDialog } from "@/components/flashcards/dialogs/create-flashcard-dialog";
import { CreateMindmapDialog } from "@/components/mindmaps/create-mindmap-dialog";
import type {
  ContextFreeDialog,
  SubjectScopedDialog,
} from "@/components/navbar/command-palette-commands";
import { CreateNoteTitleDialog } from "@/components/notes/create-note-title-dialog";
import { CreateSubjectDialog } from "@/components/subjects/create-subject-dialog";
import { isAcademicSubject } from "@/features/subjects/constants";
import {
  getMindmapDetailHref,
  getNoteDetailHref,
} from "@/lib/navigation/detail-page-back-link";
import type { SubjectEntity } from "@/lib/server/api-contracts";

export type ActiveCreateDialog = ContextFreeDialog | SubjectScopedDialog;

interface CommandPaletteDialogsProps {
  activeDialog: ActiveCreateDialog | null;
  subjectId: string | null;
  subjects: SubjectEntity[];
  aiEnabled: boolean;
  onClose: () => void;
  onNavigate: (href: string) => void;
  /** When true, a created note/mindmap opens in a window instead of navigating. */
  createInWindow: boolean;
  onOpenDocumentWindow: (kind: "mindmap" | "note", docId: string) => void;
}

/**
 * Renders the reusable create dialogs the command palette opens. Each dialog is
 * controlled by `activeDialog`; closing any of them clears palette state.
 */
export function CommandPaletteDialogs({
  activeDialog,
  subjectId,
  subjects,
  aiEnabled,
  onClose,
  onNavigate,
  createInWindow,
  onOpenDocumentWindow,
}: Readonly<CommandPaletteDialogsProps>) {
  function handleOpenChange(open: boolean) {
    if (!open) {
      onClose();
    }
  }

  return (
    <>
      <CreateSubjectDialog
        trigger={null}
        open={activeDialog === "subject"}
        onOpenChange={handleOpenChange}
      />
      <CreateFlashcardDialog
        open={activeDialog === "flashcard"}
        onOpenChange={handleOpenChange}
        aiEnabled={aiEnabled}
      />
      <CreateAssessmentDialog
        subjects={subjects.filter((subject) => isAcademicSubject(subject.kind))}
        open={activeDialog === "assessment"}
        onOpenChange={handleOpenChange}
      />
      {subjectId ? (
        <CreateNoteTitleDialog
          subjectId={subjectId}
          open={activeDialog === "note"}
          onOpenChange={handleOpenChange}
          onSuccess={(noteId) =>
            createInWindow
              ? onOpenDocumentWindow("note", noteId)
              : onNavigate(getNoteDetailHref(subjectId, noteId))
          }
        />
      ) : null}
      {subjectId ? (
        <CreateMindmapDialog
          subjectId={subjectId}
          open={activeDialog === "mindmap"}
          onOpenChange={handleOpenChange}
          onSuccess={(mindmapId) =>
            createInWindow
              ? onOpenDocumentWindow("mindmap", mindmapId)
              : onNavigate(getMindmapDetailHref(subjectId, mindmapId))
          }
        />
      ) : null}
    </>
  );
}
