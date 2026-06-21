"use client";

import type { ReactNode } from "react";
import { LazyCreateAssessmentDialog } from "@/components/assessments/lazy-create-assessment-dialog";
import { RecordMissDialog } from "@/components/attendance/record-miss-dialog";
import { LazyCreateFlashcardDialog } from "@/components/flashcards/dialogs/lazy-create-flashcard-dialog";
import { AddBookDialog } from "@/components/library/add-book-dialog";
import { CreateMindmapDialog } from "@/components/mindmaps/create-mindmap-dialog";
import { CreateNoteTitleDialog } from "@/components/notes/create-note-title-dialog";
import { CreateSubjectDialog } from "@/components/subjects/create-subject-dialog";
import { DeleteSubjectDialog } from "@/components/subjects/delete-subject-dialog";
import { EditSubjectDialog } from "@/components/subjects/edit-subject-dialog";
import type {
  SubjectDeleteTarget,
  SubjectEditTarget,
} from "@/components/subjects/tree/subject-tree-types";

interface SubjectTreeDialogsProps {
  /** Shared document kebab dialog host rendered alongside the tree dialogs. */
  documentDialogs: ReactNode;
  aiEnabled: boolean;
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
  createParentId?: string;
  onSubjectCreated: () => void;
  editTarget: SubjectEditTarget | null;
  onEditTargetChange: (target: SubjectEditTarget | null) => void;
  deleteTarget: SubjectDeleteTarget | null;
  onDeleteTargetChange: (target: SubjectDeleteTarget | null) => void;
  createNoteSubjectId: string | null;
  onCreateNoteSubjectIdChange: (id: string | null) => void;
  onNoteCreated: (noteId: string) => void;
  createMindmapSubjectId: string | null;
  onCreateMindmapSubjectIdChange: (id: string | null) => void;
  onMindmapCreated: (mindmapId: string) => void;
  createBookSubjectId: string | null;
  onCreateBookSubjectIdChange: (id: string | null) => void;
  onBookUploaded: (book: { id: string; subjectId: string }) => void;
  createFlashcardSubjectId: string | null;
  onCreateFlashcardSubjectIdChange: (id: string | null) => void;
  createAssessmentSubjectId: string | null;
  onCreateAssessmentSubjectIdChange: (id: string | null) => void;
  recordMissSubjectId: string | null;
  onRecordMissSubjectIdChange: (id: string | null) => void;
  /** Re-fetch tree counts after a mutating dialog completes. */
  onRefreshTree: () => void;
}

/**
 * Renders every dialog the subject tree can open (create/edit/delete subject,
 * create note/mindmap/book/flashcard/assessment, record miss) plus the shared
 * document kebab dialog host. Split out of `subject-tree-sidebar.tsx` to keep
 * that file focused on tree state and within the file-size guard.
 */
export function SubjectTreeDialogs({
  documentDialogs,
  aiEnabled,
  createOpen,
  onCreateOpenChange,
  createParentId,
  onSubjectCreated,
  editTarget,
  onEditTargetChange,
  deleteTarget,
  onDeleteTargetChange,
  createNoteSubjectId,
  onCreateNoteSubjectIdChange,
  onNoteCreated,
  createMindmapSubjectId,
  onCreateMindmapSubjectIdChange,
  onMindmapCreated,
  createBookSubjectId,
  onCreateBookSubjectIdChange,
  onBookUploaded,
  createFlashcardSubjectId,
  onCreateFlashcardSubjectIdChange,
  createAssessmentSubjectId,
  onCreateAssessmentSubjectIdChange,
  recordMissSubjectId,
  onRecordMissSubjectIdChange,
  onRefreshTree,
}: Readonly<SubjectTreeDialogsProps>) {
  return (
    <>
      {documentDialogs}

      <CreateSubjectDialog
        open={createOpen}
        onOpenChange={onCreateOpenChange}
        parentSubjectId={createParentId}
        onCreated={onSubjectCreated}
      />

      {editTarget ? (
        <EditSubjectDialog
          subject={editTarget}
          open
          onOpenChange={(open) => {
            if (!open) {
              onEditTargetChange(null);
            }
          }}
          onSaved={() => {
            onEditTargetChange(null);
            onRefreshTree();
          }}
        />
      ) : null}

      {deleteTarget ? (
        <DeleteSubjectDialog
          subjectId={deleteTarget.id}
          subjectName={deleteTarget.name}
          open
          onOpenChange={(open) => {
            if (!open) {
              onDeleteTargetChange(null);
            }
          }}
          onSuccess={() => {
            onDeleteTargetChange(null);
            onRefreshTree();
          }}
        />
      ) : null}

      {createNoteSubjectId ? (
        <CreateNoteTitleDialog
          subjectId={createNoteSubjectId}
          open
          onOpenChange={(open) => {
            if (!open) {
              onCreateNoteSubjectIdChange(null);
            }
          }}
          onSuccess={(noteId) => {
            onNoteCreated(noteId);
          }}
        />
      ) : null}

      {createMindmapSubjectId ? (
        <CreateMindmapDialog
          subjectId={createMindmapSubjectId}
          open
          onOpenChange={(open) => {
            if (!open) {
              onCreateMindmapSubjectIdChange(null);
            }
          }}
          onSuccess={(mindmapId) => {
            onMindmapCreated(mindmapId);
          }}
        />
      ) : null}

      {createBookSubjectId ? (
        <AddBookDialog
          trigger={null}
          subjectId={createBookSubjectId}
          open
          onOpenChange={(open) => {
            if (!open) {
              onCreateBookSubjectIdChange(null);
            }
          }}
          onUploaded={onBookUploaded}
        />
      ) : null}

      <LazyCreateFlashcardDialog
        subjectId={createFlashcardSubjectId ?? undefined}
        open={createFlashcardSubjectId !== null}
        onOpenChange={(open) => {
          if (!open) {
            onCreateFlashcardSubjectIdChange(null);
          }
        }}
        aiEnabled={aiEnabled}
      />

      <LazyCreateAssessmentDialog
        subjectId={createAssessmentSubjectId ?? undefined}
        open={createAssessmentSubjectId !== null}
        onOpenChange={(open) => {
          if (!open) {
            onCreateAssessmentSubjectIdChange(null);
          }
        }}
        onCreated={() => {
          onCreateAssessmentSubjectIdChange(null);
          onRefreshTree();
        }}
      />

      {recordMissSubjectId ? (
        <RecordMissDialog
          subjectId={recordMissSubjectId}
          open
          onOpenChange={(open) => {
            if (!open) {
              onRecordMissSubjectIdChange(null);
            }
          }}
        />
      ) : null}
    </>
  );
}
