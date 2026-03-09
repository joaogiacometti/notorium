import { z } from "zod";
import {
  createFlashcardSchema,
  flashcardBackSchema,
  flashcardFrontSchema,
} from "@/features/flashcards/validation";
import { validationMessage } from "@/lib/validations/validation-messages";

function isValidDateString(value: string) {
  return !Number.isNaN(new Date(value).getTime());
}

export const ankiImportCardSchema = z.object({
  front: flashcardFrontSchema,
  back: flashcardBackSchema,
  state: z.enum(["new", "learning", "review", "relearning"]).optional(),
  dueAt: z
    .string()
    .refine(
      isValidDateString,
      validationMessage("Validation.ankiImport.invalidDate"),
    )
    .optional(),
  stability: z.number().finite().nullable().optional(),
  difficulty: z.number().finite().nullable().optional(),
  ease: z.number().int().optional(),
  intervalDays: z.number().int().optional(),
  learningStep: z.number().int().nullable().optional(),
  lastReviewedAt: z
    .string()
    .refine(
      isValidDateString,
      validationMessage("Validation.ankiImport.invalidDate"),
    )
    .nullable()
    .optional(),
  reviewCount: z.number().int().optional(),
  lapseCount: z.number().int().optional(),
});

export const ankiImportCardsSchema = z.array(ankiImportCardSchema);

export const importAnkiFlashcardsSchema = z.object({
  subjectId: createFlashcardSchema.shape.subjectId,
  cards: ankiImportCardsSchema,
});

export type AnkiImportCard = z.infer<typeof ankiImportCardSchema>;
export type ImportAnkiFlashcardsInput = z.infer<
  typeof importAnkiFlashcardsSchema
>;
