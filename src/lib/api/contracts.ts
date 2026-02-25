import type { InferSelectModel } from "drizzle-orm";
import type {
  attendanceMiss,
  grade,
  gradeCategory,
  note,
  subject,
} from "@/db/schema";

export type SubjectEntity = InferSelectModel<typeof subject>;
export type NoteEntity = InferSelectModel<typeof note>;
export type AttendanceMissEntity = InferSelectModel<typeof attendanceMiss>;
export type GradeEntity = InferSelectModel<typeof grade>;
export type GradeCategoryEntity = InferSelectModel<typeof gradeCategory>;

export type GradeCategoryWithGrades = GradeCategoryEntity & {
  grades: GradeEntity[];
};

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
