import type { InferSelectModel } from "drizzle-orm";
import type {
  assessment,
  attendanceMiss,
  note,
  noteImageAttachment,
  subject,
} from "@/db/schema";

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
>;

export type NoteEditDto = Pick<NoteEntity, "id" | "title" | "content">;

export type MutationResult =
  | { success: true; error?: never }
  | { success?: false; error: string };
