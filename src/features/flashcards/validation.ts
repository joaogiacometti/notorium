import { z } from "zod";
import { LIMITS } from "@/lib/config/limits";
import {
  countInternalAttachmentImages,
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
    (value) => richTextToPlainText(value).length <= LIMITS.flashcardFrontMax,
    validationMessage("Validation.flashcards.frontMaxLength"),
  );

export const flashcardBackSchema = z
  .string()
  .refine(
    (value) => hasRichTextContent(value),
    validationMessage("Validation.flashcards.backRequired"),
  )
  .refine(
    (value) => richTextToPlainText(value).length <= LIMITS.flashcardBackMax,
    validationMessage("Validation.flashcards.backMaxLength"),
  );

const optionalDeckIdSchema = z
  .union([z.string().min(1), z.literal("")])
  .nullable()
  .optional();

function hasAllowedFlashcardAttachmentCount(front: string, back: string) {
  return (
    countInternalAttachmentImages(front) +
      countInternalAttachmentImages(back) <=
    LIMITS.maxAttachmentsPerFlashcard
  );
}

function withFlashcardAttachmentLimit<
  TSchema extends z.ZodRawShape & {
    front: z.ZodString;
    back: z.ZodString;
  },
>(schema: z.ZodObject<TSchema>) {
  return schema.refine(
    (value) => {
      if (typeof value !== "object" || value === null) {
        return false;
      }

      if (!("front" in value) || !("back" in value)) {
        return false;
      }

      if (typeof value.front !== "string" || typeof value.back !== "string") {
        return false;
      }

      return hasAllowedFlashcardAttachmentCount(value.front, value.back);
    },
    {
      path: ["back"],
      message: validationMessage("Validation.flashcards.attachmentLimit", {
        max: LIMITS.maxAttachmentsPerFlashcard,
      }),
    },
  );
}

export const createFlashcardSchema = withFlashcardAttachmentLimit(
  z.object({
    subjectId: z
      .string()
      .min(1, validationMessage("Validation.flashcards.subjectRequired")),
    deckId: optionalDeckIdSchema,
    front: flashcardFrontSchema,
    back: flashcardBackSchema,
  }),
);

export type CreateFlashcardForm = z.infer<typeof createFlashcardSchema>;

export const editFlashcardSchema = withFlashcardAttachmentLimit(
  z.object({
    id: z.string().min(1),
    subjectId: z.string().min(1),
    deckId: optionalDeckIdSchema,
    front: flashcardFrontSchema,
    back: flashcardBackSchema,
  }),
);

export type EditFlashcardForm = z.infer<typeof editFlashcardSchema>;

export const generateFlashcardBackSchema = z.object({
  subjectId: z.string().min(1),
  deckId: optionalDeckIdSchema,
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

export const bulkResetFlashcardsSchema = z.object({
  ids: bulkFlashcardIdsSchema,
});

export type BulkResetFlashcardsForm = z.infer<typeof bulkResetFlashcardsSchema>;

export const bulkMoveFlashcardsSchema = z.object({
  ids: bulkFlashcardIdsSchema,
  subjectId: z
    .string()
    .min(1, validationMessage("Validation.flashcards.subjectRequired")),
  deckId: optionalDeckIdSchema,
});

export type BulkMoveFlashcardsForm = z.infer<typeof bulkMoveFlashcardsSchema>;

export const resetFlashcardSchema = z.object({
  id: z.string().min(1),
});

export type ResetFlashcardForm = z.infer<typeof resetFlashcardSchema>;

export const flashcardsManageQuerySchema = z.object({
  pageIndex: z.number().int().min(0).default(0),
  pageSize: z
    .number()
    .int()
    .min(LIMITS.pageSizeMin)
    .max(LIMITS.pageSizeMax)
    .default(25),
  subjectId: z.string().min(1).optional(),
  deckId: z.string().min(1).optional(),
  search: z.string().trim().max(LIMITS.searchQueryMax).optional(),
});

export type FlashcardsManageQueryInput = z.infer<
  typeof flashcardsManageQuerySchema
>;

export const validateFlashcardsSchema = z.object({
  flashcardIds: z
    .array(z.string().min(1))
    .min(1)
    .max(LIMITS.flashcardBatchSize)
    .refine((ids) => new Set(ids).size === ids.length),
});

export type ValidateFlashcardsForm = z.infer<typeof validateFlashcardsSchema>;

export const getFlashcardIdsForSubjectSchema = z.object({
  subjectId: z.string().min(1),
});

export type GetFlashcardIdsForSubjectForm = z.infer<
  typeof getFlashcardIdsForSubjectSchema
>;

export const generateFlashcardsSchema = z.object({
  subjectId: z
    .string()
    .min(1, validationMessage("Validation.flashcards.subjectRequired")),
  deckId: optionalDeckIdSchema,
  text: z
    .string()
    .min(1, validationMessage("Validation.flashcards.textRequired"))
    .max(
      LIMITS.flashcardAiMaxInput,
      validationMessage("Validation.flashcards.textMaxLength"),
    ),
});

export type GenerateFlashcardsForm = z.infer<typeof generateFlashcardsSchema>;
