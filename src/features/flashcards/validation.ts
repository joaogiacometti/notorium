import { z } from "zod";
import { LIMITS } from "@/lib/config/limits";
import {
  countInternalAttachmentImages,
  hasRichTextContent,
  richTextToPlainText,
} from "@/lib/editor/rich-text";
import {
  bulkIdsSchema,
  idSchema,
  optionalBulkIdsSchema,
} from "@/lib/validations/schemas";
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

const subjectIdField = z
  .string()
  .min(1, validationMessage("Validation.flashcards.subjectRequired"));

function withFlashcardAttachmentLimit<
  TSchema extends z.ZodType<{ front: string; back: string }>,
>(schema: TSchema) {
  return schema.refine(
    (value) =>
      countInternalAttachmentImages(value.front) +
        countInternalAttachmentImages(value.back) <=
      LIMITS.maxAttachmentsPerFlashcard,
    {
      path: ["back"],
      message: validationMessage("Validation.flashcards.attachmentLimit", {
        max: LIMITS.maxAttachmentsPerFlashcard,
      }),
    },
  );
}

const createFlashcardObject = z.object({
  subjectId: subjectIdField,
  front: flashcardFrontSchema,
  back: flashcardBackSchema,
});

export const createFlashcardSchema = withFlashcardAttachmentLimit(
  createFlashcardObject,
);

export type CreateFlashcardForm = z.infer<typeof createFlashcardSchema>;

export const editFlashcardSchema = withFlashcardAttachmentLimit(
  createFlashcardObject.extend({ id: idSchema }),
);

export type EditFlashcardForm = z.infer<typeof editFlashcardSchema>;

// Shape the create/edit dialog forms bind to: the create payload plus the id
// the edit dialog carries.
export const flashcardFormSchema = withFlashcardAttachmentLimit(
  createFlashcardObject.extend({ id: z.string().optional() }),
);

export type FlashcardFormValues = z.infer<typeof flashcardFormSchema>;

export const generateFlashcardBackSchema = z.object({
  subjectId: subjectIdField,
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
  id: idSchema,
});

export type DeleteFlashcardForm = z.infer<typeof deleteFlashcardSchema>;

export const bulkDeleteFlashcardsSchema = z.object({
  ids: bulkIdsSchema,
});

export type BulkDeleteFlashcardsForm = z.infer<
  typeof bulkDeleteFlashcardsSchema
>;

export const bulkResetFlashcardsSchema = z.object({
  ids: bulkIdsSchema,
});

export type BulkResetFlashcardsForm = z.infer<typeof bulkResetFlashcardsSchema>;

export const bulkMoveFlashcardsSchema = z.object({
  ids: bulkIdsSchema,
  subjectId: subjectIdField,
});

export type BulkMoveFlashcardsForm = z.infer<typeof bulkMoveFlashcardsSchema>;

export const resetFlashcardSchema = z.object({
  id: idSchema,
});

export type ResetFlashcardForm = z.infer<typeof resetFlashcardSchema>;

export const proposeFlashcardMergeSchema = z.object({
  flashcardId: idSchema,
});

export type ProposeFlashcardMergeForm = z.infer<
  typeof proposeFlashcardMergeSchema
>;

export const applyFlashcardMergeSchema = withFlashcardAttachmentLimit(
  z.object({
    action: z.enum(["relate", "merge"]),
    primaryFlashcardId: idSchema,
    front: flashcardFrontSchema,
    back: flashcardBackSchema,
    sourceFlashcardIds: z
      .array(idSchema)
      .min(1)
      .max(LIMITS.flashcardBatchSize)
      .refine((ids) => new Set(ids).size === ids.length),
  }),
);

export type ApplyFlashcardMergeForm = z.infer<typeof applyFlashcardMergeSchema>;

export const flashcardsManageQuerySchema = z.object({
  pageIndex: z.number().int().min(0).default(0),
  pageSize: z
    .number()
    .int()
    .min(LIMITS.pageSizeMin)
    .max(LIMITS.pageSizeMax)
    .default(25),
  subjectId: idSchema.optional(),
  subjectIds: optionalBulkIdsSchema,
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

export const flashcardIdsQuerySchema = z.object({
  subjectId: idSchema.optional(),
});

export const flashcardContentsQuerySchema = z.object({
  ids: z.array(idSchema).min(1).max(LIMITS.flashcardContentsReadMax),
});

export const generateNoteFlashcardsSchema = z.object({
  noteId: idSchema,
  subjectId: subjectIdField,
});

export type GenerateNoteFlashcardsForm = z.infer<
  typeof generateNoteFlashcardsSchema
>;

export const generateMindmapFlashcardsSchema = z.object({
  mindmapId: idSchema,
  sourceNodeId: idSchema.optional(),
  subjectId: subjectIdField,
});

export type GenerateMindmapFlashcardsForm = z.infer<
  typeof generateMindmapFlashcardsSchema
>;
