"use client";

import { CreateAssessmentDialog } from "@/components/assessments/create-assessment-dialog";
import { CreateDeckDialog } from "@/components/decks/create-deck-dialog";
import { CreateFlashcardDialog } from "@/components/flashcards/dialogs/create-flashcard-dialog";
import { AddBookDialog } from "@/components/library/add-book-dialog";
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
}: Readonly<CommandPaletteDialogsProps>) {
  function handleOpenChange(open: boolean) {
    if (!open) {
      onClose();
    }
  }

  return (
    <>
      <AddBookDialog
        trigger={null}
        open={activeDialog === "book"}
        onOpenChange={handleOpenChange}
      />
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
      <CreateDeckDialog
        trigger={null}
        open={activeDialog === "deck"}
        onOpenChange={handleOpenChange}
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
            onNavigate(getNoteDetailHref(subjectId, noteId))
          }
        />
      ) : null}
      {subjectId ? (
        <CreateMindmapDialog
          subjectId={subjectId}
          open={activeDialog === "mindmap"}
          onOpenChange={handleOpenChange}
          onSuccess={(mindmapId) =>
            onNavigate(getMindmapDetailHref(subjectId, mindmapId))
          }
        />
      ) : null}
    </>
  );
}
