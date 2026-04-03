import { z } from "zod";
import { LIMITS } from "@/lib/config/limits";

function isValidDateString(value: string) {
  return !Number.isNaN(new Date(value).getTime());
}

const finiteNumberSchema = z.number().finite();
const nonNegativeIntegerSchema = z.number().int().nonnegative();
const isoDateStringSchema = z.string().refine(isValidDateString);

const attendanceMissSchema = z.object({
  missDate: z.string(),
});

const noteSchema = z.object({
  title: z.string().min(1).max(LIMITS.noteTitleMax),
  content: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const assessmentSchema = z.object({
  title: z.string().min(1).max(LIMITS.assessmentTitleMax),
  description: z.string().nullable(),
  type: z.enum([
    "exam",
    "assignment",
    "project",
    "presentation",
    "homework",
    "other",
  ]),
  status: z.enum(["pending", "completed"]),
  dueDate: z.string().nullable(),
  score: z.string().nullable(),
  weight: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const flashcardSchema = z.object({
  front: z.string().min(1).max(LIMITS.flashcardFrontMax),
  back: z.string().min(1).max(LIMITS.flashcardBackMax),
  state: z.enum(["new", "learning", "review", "relearning"]),
  dueAt: isoDateStringSchema,
  stability: finiteNumberSchema.nullable().optional(),
  difficulty: finiteNumberSchema.nullable().optional(),
  ease: z.number().int(),
  intervalDays: nonNegativeIntegerSchema,
  learningStep: nonNegativeIntegerSchema.nullable(),
  lastReviewedAt: isoDateStringSchema.nullable(),
  reviewCount: nonNegativeIntegerSchema,
  lapseCount: nonNegativeIntegerSchema,
  createdAt: isoDateStringSchema,
  updatedAt: isoDateStringSchema,
});

const subjectSchema = z.object({
  name: z.string().min(1).max(LIMITS.subjectNameMax),
  description: z.string().nullable(),
  totalClasses: z.number().int().positive().nullable(),
  maxMisses: z.number().int().nonnegative().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  notes: z.array(noteSchema).optional().default([]),
  attendanceMisses: z.array(attendanceMissSchema),
  assessments: z.array(assessmentSchema),
  flashcards: z.array(flashcardSchema).optional().default([]),
});

const flashcardSchedulerSchema = z.object({
  desiredRetention: finiteNumberSchema,
  weights: z.array(finiteNumberSchema),
});

export const importDataSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  flashcardScheduler: flashcardSchedulerSchema.optional(),
  subjects: z.array(subjectSchema),
});

export type ImportData = z.infer<typeof importDataSchema>;
