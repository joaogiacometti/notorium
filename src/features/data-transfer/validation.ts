import { z } from "zod";
import {
  assessmentStatusValues,
  assessmentTypeValues,
} from "@/features/assessments/constants";
import { LIMITS } from "@/lib/config/limits";
import { countInternalAttachmentImages } from "@/lib/editor/rich-text";

function isValidDateString(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return false;
  }
  return !Number.isNaN(new Date(value).getTime());
}

const finiteNumberSchema = z.number().finite();
const nonNegativeIntegerSchema = z.number().int().nonnegative();
const dateStringSchema = z.string().refine(isValidDateString);

const attendanceMissSchema = z.object({
  missDate: dateStringSchema,
});

const noteSchema = z.object({
  title: z.string().min(1).max(LIMITS.noteTitleMax),
  content: z
    .string()
    .nullable()
    .refine(
      (value) =>
        value === null ||
        countInternalAttachmentImages(value) <= LIMITS.maxAttachmentsPerNote,
    ),
  createdAt: dateStringSchema,
  updatedAt: dateStringSchema,
});

const assessmentSchema = z.object({
  title: z.string().min(1).max(LIMITS.assessmentTitleMax),
  description: z.string().nullable(),
  type: z.enum(assessmentTypeValues),
  status: z.enum(assessmentStatusValues),
  dueDate: z.string().nullable(),
  score: z.string().nullable(),
  weight: z.string().nullable(),
  createdAt: dateStringSchema,
  updatedAt: dateStringSchema,
});

const flashcardSchema = z
  .object({
    front: z.string().min(1).max(LIMITS.flashcardFrontMax),
    back: z.string().min(1).max(LIMITS.flashcardBackMax),
    state: z.enum(["new", "learning", "review", "relearning"]),
    dueAt: dateStringSchema,
    stability: finiteNumberSchema.nullable().optional(),
    difficulty: finiteNumberSchema.nullable().optional(),
    ease: z.number().int(),
    intervalDays: nonNegativeIntegerSchema,
    learningStep: nonNegativeIntegerSchema.nullable(),
    lastReviewedAt: dateStringSchema.nullable(),
    reviewCount: nonNegativeIntegerSchema,
    lapseCount: nonNegativeIntegerSchema,
    deckName: z.string().min(1).optional(),
    deckPath: z.string().min(1).optional(),
    createdAt: dateStringSchema,
    updatedAt: dateStringSchema,
  })
  .refine(
    (value) =>
      countInternalAttachmentImages(value.front) +
        countInternalAttachmentImages(value.back) <=
      LIMITS.maxAttachmentsPerFlashcard,
  );

const deckSchema = z
  .object({
    name: z.string().min(1).optional(),
    path: z.string().min(1).optional(),
    description: z
      .string()
      .max(LIMITS.deckDescriptionMax)
      .nullable()
      .optional(),
  })
  .transform((value) => ({
    ...value,
    name: value.name ?? value.path ?? "",
    path: value.path ?? value.name ?? "",
  }))
  .refine((value) => value.name.length > 0 && value.path.length > 0);

const subjectSchema = z.object({
  name: z.string().min(1).max(LIMITS.subjectNameMax),
  description: z.string().nullable(),
  totalClasses: z.number().int().positive().nullable(),
  maxMisses: z.number().int().nonnegative().nullable(),
  createdAt: dateStringSchema,
  updatedAt: dateStringSchema,
  notes: z.array(noteSchema).optional().default([]),
  attendanceMisses: z.array(attendanceMissSchema),
  assessments: z.array(assessmentSchema),
});

const flashcardSchedulerSchema = z.object({
  desiredRetention: finiteNumberSchema,
  weights: z.array(finiteNumberSchema),
});

export const importDataSchema = z.object({
  version: z.union([z.literal(1), z.literal(2)]),
  exportedAt: dateStringSchema,
  flashcardScheduler: flashcardSchedulerSchema.optional(),
  decks: z.array(deckSchema).optional().default([]),
  flashcards: z.array(flashcardSchema).optional().default([]),
  subjects: z.array(subjectSchema).optional().default([]),
});

export type ImportData = z.infer<typeof importDataSchema>;
