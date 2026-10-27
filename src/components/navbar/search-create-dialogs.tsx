"use client";

import { CreateFlashcardDialog } from "@/components/flashcards/dialogs/create-flashcard-dialog";
import type { ContextFreeDialog } from "@/components/navbar/search-commands";
import { CreateNoteTitleDialog } from "@/components/notes/create-note-title-dialog";
import { CreateSubjectDialog } from "@/components/subjects/create-subject-dialog";
import { getNoteDetailHref } from "@/lib/navigation/detail-page-back-link";
import type { SubjectOption } from "@/lib/server/api-contracts";

export type ActiveCreateDialog = ContextFreeDialog;

interface SearchCreateDialogsProps {
  activeDialog: ActiveCreateDialog | null;
  subjectId: string | null;
  subjects: SubjectOption[];
  aiEnabled: boolean;
  onClose: () => void;
  onNavigate: (href: string) => void;
}

/**
 * Renders the reusable create dialogs the search dialog commands open. Each dialog is
 * controlled by `activeDialog`; closing any of them clears the pending create state.
 */
export function SearchCreateDialogs({
  activeDialog,
  subjectId,
  subjects,
  aiEnabled,
  onClose,
  onNavigate,
}: Readonly<SearchCreateDialogsProps>) {
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
        subjectId={subjectId ?? undefined}
        aiEnabled={aiEnabled}
      />
      <CreateNoteTitleDialog
        subjectId={subjectId ?? undefined}
        subjects={subjects}
        open={activeDialog === "note"}
        onOpenChange={handleOpenChange}
        onSuccess={(noteId, createdSubjectId) =>
          onNavigate(getNoteDetailHref(createdSubjectId, noteId))
        }
      />
    </>
  );
}
