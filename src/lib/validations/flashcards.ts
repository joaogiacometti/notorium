import { z } from "zod";
import { validationMessage } from "@/lib/validation-messages";

export const createFlashcardSchema = z.object({
  subjectId: z.string().min(1),
  front: z
    .string()
    .min(1, validationMessage("Validation.flashcards.frontRequired"))
    .max(500, validationMessage("Validation.flashcards.frontMaxLength")),
  back: z
    .string()
    .min(1, validationMessage("Validation.flashcards.backRequired"))
    .max(2000, validationMessage("Validation.flashcards.backMaxLength")),
});

export type CreateFlashcardForm = z.infer<typeof createFlashcardSchema>;

export const editFlashcardSchema = z.object({
  id: z.string().min(1),
  front: z
    .string()
    .min(1, validationMessage("Validation.flashcards.frontRequired"))
    .max(500, validationMessage("Validation.flashcards.frontMaxLength")),
  back: z
    .string()
    .min(1, validationMessage("Validation.flashcards.backRequired"))
    .max(2000, validationMessage("Validation.flashcards.backMaxLength")),
});

export type EditFlashcardForm = z.infer<typeof editFlashcardSchema>;

export const deleteFlashcardSchema = z.object({
  id: z.string().min(1),
});

export type DeleteFlashcardForm = z.infer<typeof deleteFlashcardSchema>;

export const resetFlashcardSchema = z.object({
  id: z.string().min(1),
});

export type ResetFlashcardForm = z.infer<typeof resetFlashcardSchema>;
