import { z } from "zod";
import {
  hasRichTextContent,
  richTextToPlainText,
} from "@/lib/editor/rich-text";
import { validationMessage } from "@/lib/validations/validation-messages";

export const flashcardFrontSchema = z
  .string()
  .refine(
    (value) => hasRichTextContent(value),
    validationMessage("Validation.flashcards.frontRequired"),
  )
  .refine(
    (value) => richTextToPlainText(value).length <= 500,
    validationMessage("Validation.flashcards.frontMaxLength"),
  );

export const flashcardBackSchema = z
  .string()
  .refine(
    (value) => hasRichTextContent(value),
    validationMessage("Validation.flashcards.backRequired"),
  )
  .refine(
    (value) => richTextToPlainText(value).length <= 2000,
    validationMessage("Validation.flashcards.backMaxLength"),
  );

export const createFlashcardSchema = z.object({
  subjectId: z
    .string()
    .min(1, validationMessage("Validation.flashcards.subjectRequired")),
  front: flashcardFrontSchema,
  back: flashcardBackSchema,
});

export type CreateFlashcardForm = z.infer<typeof createFlashcardSchema>;

export const editFlashcardSchema = z.object({
  id: z.string().min(1),
  subjectId: z.string().min(1),
  front: flashcardFrontSchema,
  back: flashcardBackSchema,
});

export type EditFlashcardForm = z.infer<typeof editFlashcardSchema>;

export const generateFlashcardBackSchema = z.object({
  subjectId: z.string().min(1),
  front: flashcardFrontSchema,
  currentBack: flashcardBackSchema.optional(),
});

export type GenerateFlashcardBackForm = z.infer<
  typeof generateFlashcardBackSchema
>;

export const checkFlashcardDuplicateSchema = z.object({
  id: z.string().min(1).optional(),
  front: flashcardFrontSchema,
});

export type CheckFlashcardDuplicateForm = z.infer<
  typeof checkFlashcardDuplicateSchema
>;

export { hasRichTextContent } from "@/lib/editor/rich-text";

export const deleteFlashcardSchema = z.object({
  id: z.string().min(1),
});

export type DeleteFlashcardForm = z.infer<typeof deleteFlashcardSchema>;

const bulkFlashcardIdsSchema = z
  .array(z.string().min(1))
  .min(1)
  .refine((ids) => new Set(ids).size === ids.length);

export const bulkDeleteFlashcardsSchema = z.object({
  ids: bulkFlashcardIdsSchema,
});

export type BulkDeleteFlashcardsForm = z.infer<
  typeof bulkDeleteFlashcardsSchema
>;

export const bulkMoveFlashcardsSchema = z.object({
  ids: bulkFlashcardIdsSchema,
  subjectId: z
    .string()
    .min(1, validationMessage("Validation.flashcards.subjectRequired")),
});

export type BulkMoveFlashcardsForm = z.infer<typeof bulkMoveFlashcardsSchema>;

export const resetFlashcardSchema = z.object({
  id: z.string().min(1),
});

export type ResetFlashcardForm = z.infer<typeof resetFlashcardSchema>;

export const flashcardsManageQuerySchema = z.object({
  pageIndex: z.number().int().min(0).default(0),
  pageSize: z.number().int().min(1).max(100).default(25),
  subjectId: z.string().min(1).optional(),
  search: z.string().trim().max(200).optional(),
});

export type FlashcardsManageQueryInput = z.infer<
  typeof flashcardsManageQuerySchema
>;

export const validateFlashcardsSchema = z.object({
  flashcardIds: z
    .array(z.string().min(1))
    .min(1)
    .max(500)
    .refine((ids) => new Set(ids).size === ids.length),
});

export type ValidateFlashcardsForm = z.infer<typeof validateFlashcardsSchema>;

export const getFlashcardIdsForSubjectSchema = z.object({
  subjectId: z.string().min(1),
});

export type GetFlashcardIdsForSubjectForm = z.infer<
  typeof getFlashcardIdsForSubjectSchema
>;
