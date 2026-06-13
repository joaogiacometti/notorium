import { z } from "zod";
import { hasClozeMarkers } from "@/features/flashcards/cloze";
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

// Cloze source: the authored `{{cN::answer}}` rich text. Markers are plain text
// inside the editor HTML, so length and marker checks run on the raw value.
export const flashcardClozeSourceSchema = z
  .string()
  .refine(
    (value) => hasRichTextContent(value),
    validationMessage("Validation.flashcards.clozeTextRequired"),
  )
  .refine(
    (value) => richTextToPlainText(value).length <= LIMITS.flashcardFrontMax,
    validationMessage("Validation.flashcards.clozeMaxLength"),
  )
  .refine(
    (value) => hasClozeMarkers(value),
    validationMessage("Validation.flashcards.clozeMarkersRequired"),
  );

// Optional extra/context shown beneath every cloze sibling's answer.
export const flashcardClozeExtraSchema = z
  .string()
  .refine(
    (value) => richTextToPlainText(value).length <= LIMITS.flashcardBackMax,
    validationMessage("Validation.flashcards.backMaxLength"),
  )
  .default("");

const deckIdField = z
  .string()
  .min(1, validationMessage("Validation.flashcards.deckRequired"));

// A single rectangular mask, coordinates normalized to 0..1 of the image box.
export const occlusionRegionSchema = z.object({
  id: z.string().min(1),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().gt(0).max(1),
  height: z.number().gt(0).max(1),
  label: z.string().max(LIMITS.occlusionLabelMax).optional(),
});

export const occlusionImagePathnameSchema = z
  .string()
  .min(1, validationMessage("Validation.flashcards.occlusionImageRequired"))
  .max(512);

export const occlusionRegionsSchema = z
  .array(occlusionRegionSchema)
  .min(1, validationMessage("Validation.flashcards.occlusionRegionsRequired"))
  .max(LIMITS.maxOcclusionRegionsPerNote);

// Attachment-bearing rich-text fields differ by card type: basic cards carry
// front + back, cloze notes carry the source + optional extra.
function flashcardAttachmentFields(value: unknown): string[] {
  if (typeof value !== "object" || value === null) {
    return [];
  }
  const record = value as Record<string, unknown>;
  const fields =
    record.type === "cloze"
      ? [record.clozeSource, record.back]
      : [record.front, record.back];
  return fields.filter((field): field is string => typeof field === "string");
}

function withFlashcardAttachmentLimit<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
) {
  return schema.refine(
    (value) => {
      const total = flashcardAttachmentFields(value).reduce(
        (sum, field) => sum + countInternalAttachmentImages(field),
        0,
      );
      return total <= LIMITS.maxAttachmentsPerFlashcard;
    },
    {
      path: ["back"],
      message: validationMessage("Validation.flashcards.attachmentLimit", {
        max: LIMITS.maxAttachmentsPerFlashcard,
      }),
    },
  );
}

// Requests without an explicit `type` predate cloze support; treat them as basic
// so existing callers and stored payloads keep validating unchanged.
function withDefaultBasicType(value: unknown): unknown {
  if (typeof value === "object" && value !== null && !("type" in value)) {
    return { ...(value as Record<string, unknown>), type: "basic" };
  }
  return value;
}

const basicCreateObject = z.object({
  type: z.literal("basic"),
  deckId: deckIdField,
  front: flashcardFrontSchema,
  back: flashcardBackSchema,
});

const clozeCreateObject = z.object({
  type: z.literal("cloze"),
  deckId: deckIdField,
  clozeSource: flashcardClozeSourceSchema,
  back: flashcardClozeExtraSchema,
});

const occlusionCreateObject = z.object({
  type: z.literal("occlusion"),
  deckId: deckIdField,
  occlusionImagePathname: occlusionImagePathnameSchema,
  occlusionRegions: occlusionRegionsSchema,
});

export const createFlashcardSchema = withFlashcardAttachmentLimit(
  z.preprocess(
    withDefaultBasicType,
    z.discriminatedUnion("type", [
      basicCreateObject,
      clozeCreateObject,
      occlusionCreateObject,
    ]),
  ),
);

export type CreateFlashcardForm = z.infer<typeof createFlashcardSchema>;

const basicEditObject = basicCreateObject.extend({ id: idSchema });
const clozeEditObject = clozeCreateObject.extend({ id: idSchema });
const occlusionEditObject = occlusionCreateObject.extend({ id: idSchema });

export const editFlashcardSchema = withFlashcardAttachmentLimit(
  z.preprocess(
    withDefaultBasicType,
    z.discriminatedUnion("type", [
      basicEditObject,
      clozeEditObject,
      occlusionEditObject,
    ]),
  ),
);

export type EditFlashcardForm = z.infer<typeof editFlashcardSchema>;

// Flat shape the create/edit dialog forms bind to. React Hook Form works poorly
// with discriminated unions, so the form holds every field and validates the
// active card type, then maps to the server union at submit time.
export const flashcardFormSchema = z
  .object({
    type: z.enum(["basic", "cloze", "occlusion"]),
    id: z.string().optional(),
    deckId: deckIdField,
    front: z.string(),
    back: z.string(),
    clozeSource: z.string(),
    occlusionImagePathname: z.string(),
    occlusionRegions: z.array(occlusionRegionSchema),
  })
  .superRefine((value, ctx) => {
    if (value.type === "occlusion") {
      addFieldIssues(
        ctx,
        "occlusionImagePathname",
        occlusionImagePathnameSchema,
        value.occlusionImagePathname,
      );
      addFieldIssues(
        ctx,
        "occlusionRegions",
        occlusionRegionsSchema,
        value.occlusionRegions,
      );
      return;
    }
    if (value.type === "cloze") {
      addFieldIssues(
        ctx,
        "clozeSource",
        flashcardClozeSourceSchema,
        value.clozeSource,
      );
      addFieldIssues(ctx, "back", flashcardClozeExtraSchema, value.back);
    } else {
      addFieldIssues(ctx, "front", flashcardFrontSchema, value.front);
      addFieldIssues(ctx, "back", flashcardBackSchema, value.back);
    }
    const fields =
      value.type === "cloze"
        ? [value.clozeSource, value.back]
        : [value.front, value.back];
    const attachments = fields.reduce(
      (sum, field) => sum + countInternalAttachmentImages(field),
      0,
    );
    if (attachments > LIMITS.maxAttachmentsPerFlashcard) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["back"],
        message: validationMessage("Validation.flashcards.attachmentLimit", {
          max: LIMITS.maxAttachmentsPerFlashcard,
        }),
      });
    }
  });

export type FlashcardFormValues = z.infer<typeof flashcardFormSchema>;

function addFieldIssues(
  ctx: z.RefinementCtx,
  path: string,
  schema: z.ZodTypeAny,
  value: unknown,
): void {
  const result = schema.safeParse(value);
  if (result.success) {
    return;
  }
  for (const issue of result.error.issues) {
    ctx.addIssue({ ...issue, path: [path] });
  }
}

/**
 * Maps flat form values to the server create payload, dropping inactive fields.
 *
 * @example
 * toCreateFlashcardPayload({ type: "cloze", deckId, clozeSource, back, front: "" });
 */
export function toCreateFlashcardPayload(
  values: FlashcardFormValues,
): CreateFlashcardForm {
  if (values.type === "occlusion") {
    return {
      type: "occlusion",
      deckId: values.deckId,
      occlusionImagePathname: values.occlusionImagePathname,
      occlusionRegions: values.occlusionRegions,
    };
  }
  if (values.type === "cloze") {
    return {
      type: "cloze",
      deckId: values.deckId,
      clozeSource: values.clozeSource,
      back: values.back,
    };
  }
  return {
    type: "basic",
    deckId: values.deckId,
    front: values.front,
    back: values.back,
  };
}

/**
 * Maps flat form values (with an id) to the server edit payload.
 *
 * @example
 * toEditFlashcardPayload({ id, type: "basic", deckId, front, back, clozeSource: "" });
 */
export function toEditFlashcardPayload(
  values: FlashcardFormValues & { id: string },
): EditFlashcardForm {
  if (values.type === "occlusion") {
    return {
      id: values.id,
      type: "occlusion",
      deckId: values.deckId,
      occlusionImagePathname: values.occlusionImagePathname,
      occlusionRegions: values.occlusionRegions,
    };
  }
  if (values.type === "cloze") {
    return {
      id: values.id,
      type: "cloze",
      deckId: values.deckId,
      clozeSource: values.clozeSource,
      back: values.back,
    };
  }
  return {
    id: values.id,
    type: "basic",
    deckId: values.deckId,
    front: values.front,
    back: values.back,
  };
}

export const generateFlashcardBackSchema = z.object({
  deckId: z
    .string()
    .min(1, validationMessage("Validation.flashcards.deckRequired")),
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
  deckId: z
    .string()
    .min(1, validationMessage("Validation.flashcards.deckRequired")),
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
  deckId: idSchema.optional(),
  deckIds: optionalBulkIdsSchema,
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

export const getFlashcardIdsForDeckSchema = z.object({
  deckId: z.string().min(1),
});

export type GetFlashcardIdsForDeckForm = z.infer<
  typeof getFlashcardIdsForDeckSchema
>;

export const generateFlashcardsSchema = z.object({
  deckId: z
    .string()
    .min(1, validationMessage("Validation.flashcards.deckRequired")),
  text: z
    .string()
    .min(1, validationMessage("Validation.flashcards.textRequired"))
    .max(
      LIMITS.flashcardAiMaxInput,
      validationMessage("Validation.flashcards.textMaxLength"),
    ),
});

export type GenerateFlashcardsForm = z.infer<typeof generateFlashcardsSchema>;

export const generateNoteFlashcardsSchema = z.object({
  noteId: idSchema,
  deckId: z
    .string()
    .min(1, validationMessage("Validation.flashcards.deckRequired")),
});

export type GenerateNoteFlashcardsForm = z.infer<
  typeof generateNoteFlashcardsSchema
>;
