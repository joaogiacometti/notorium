import { z } from "zod";

const attendanceMissSchema = z.object({
  missDate: z.string(),
});

const noteSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const assessmentSchema = z.object({
  title: z.string().min(1).max(200),
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
  front: z.string().min(1).max(500),
  back: z.string().min(1).max(2000),
  state: z.enum(["new", "learning", "review", "relearning"]),
  dueAt: z.string(),
  stability: z.number().nullable().optional(),
  difficulty: z.number().nullable().optional(),
  ease: z.number().int(),
  intervalDays: z.number().int(),
  learningStep: z.number().int().nullable(),
  lastReviewedAt: z.string().nullable(),
  reviewCount: z.number().int(),
  lapseCount: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const subjectSchema = z.object({
  name: z.string().min(1).max(100),
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
  desiredRetention: z.number(),
  weights: z.array(z.number()),
});

export const importDataSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  flashcardScheduler: flashcardSchedulerSchema.optional(),
  subjects: z.array(subjectSchema),
});

export type ImportData = z.infer<typeof importDataSchema>;
