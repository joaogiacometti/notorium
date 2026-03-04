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
});

export const importDataSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  subjects: z.array(subjectSchema),
});

export type ImportData = z.infer<typeof importDataSchema>;
