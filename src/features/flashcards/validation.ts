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
  subjectId: z.string().min(1),
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
});

export type GenerateFlashcardBackForm = z.infer<
  typeof generateFlashcardBackSchema
>;

export { hasRichTextContent };

export const deleteFlashcardSchema = z.object({
  id: z.string().min(1),
});

export type DeleteFlashcardForm = z.infer<typeof deleteFlashcardSchema>;

export const resetFlashcardSchema = z.object({
  id: z.string().min(1),
});

export type ResetFlashcardForm = z.infer<typeof resetFlashcardSchema>;
