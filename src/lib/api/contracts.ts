import type { InferSelectModel } from "drizzle-orm";
import type {
  assessment,
  attendanceMiss,
  flashcard,
  note,
  noteImageAttachment,
  subject,
} from "@/db/schema";
import type { ActionErrorResult } from "@/lib/server-action-errors";

export type SubjectEntity = InferSelectModel<typeof subject>;
export type NoteEntity = InferSelectModel<typeof note>;
export type NoteImageAttachmentEntity = InferSelectModel<
  typeof noteImageAttachment
>;
export type NoteWithAttachmentsEntity = NoteEntity & {
  attachments: NoteImageAttachmentEntity[];
};
export type AttendanceMissEntity = InferSelectModel<typeof attendanceMiss>;
export type AssessmentEntity = InferSelectModel<typeof assessment>;
export type FlashcardEntity = InferSelectModel<typeof flashcard>;

export type SearchSubjectResult = Pick<
  SubjectEntity,
  "id" | "name" | "description"
>;

export type SearchNoteResult = Pick<
  NoteEntity,
  "id" | "title" | "content" | "subjectId"
> & {
  subjectName: string;
};

export type SearchData = {
  subjects: SearchSubjectResult[];
  notes: SearchNoteResult[];
};

export type SubjectEditDto = Pick<
  SubjectEntity,
  | "id"
  | "name"
  | "description"
  | "notesEnabled"
  | "gradesEnabled"
  | "attendanceEnabled"
  | "flashcardsEnabled"
>;

export type NoteEditDto = Pick<NoteEntity, "id" | "title" | "content">;

export type MutationResult = { success: true } | ActionErrorResult;
