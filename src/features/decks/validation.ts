import { z } from "zod";
import { LIMITS } from "@/lib/config/limits";
import { validationMessage } from "@/lib/validations/validation-messages";

export const deckNameSchema = z
  .string()
  .min(1, validationMessage("Validation.decks.nameRequired"))
  .max(LIMITS.deckNameMax, validationMessage("Validation.decks.nameMaxLength"));

export const createDeckSchema = z.object({
  parentDeckId: z.string().min(1).optional(),
  name: deckNameSchema,
});

export type CreateDeckForm = z.infer<typeof createDeckSchema>;

export const editDeckSchema = z.object({
  id: z.string().min(1),
  name: deckNameSchema,
});

export type EditDeckForm = z.infer<typeof editDeckSchema>;

export const deleteDeckSchema = z.object({
  id: z.string().min(1),
});

export type DeleteDeckForm = z.infer<typeof deleteDeckSchema>;

export const moveDeckSchema = z.object({
  id: z.string().min(1),
  parentDeckId: z.string().min(1).optional(),
});

export type MoveDeckForm = z.infer<typeof moveDeckSchema>;
