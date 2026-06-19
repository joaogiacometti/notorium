import { z } from "zod";
import { LIMITS } from "@/lib/config/limits";
import { validationMessage } from "@/lib/validations/validation-messages";

// PdfAnnotationSubtype.HIGHLIGHT from @embedpdf/models. Pinned as a literal so a
// client cannot smuggle a different annotation subtype through the highlight
// persistence path.
export const HIGHLIGHT_SUBTYPE = 9;

// Upper bound on quad count for a single highlight. A normal text selection
// produces one rect per line; this caps a pathological or hand-crafted payload.
const MAX_SEGMENT_RECTS = 2000;

const pointSchema = z.object({ x: z.number(), y: z.number() });
const sizeSchema = z.object({ width: z.number(), height: z.number() });
const rectSchema = z.object({ origin: pointSchema, size: sizeSchema });

const hexColorSchema = z
  .string()
  .regex(
    /^#[0-9a-fA-F]{6}$/,
    validationMessage("Validation.library.invalidData"),
  );

// Dates serialize to ISO strings over the wire; the mappers revive them when
// handing the object back to the reader.
const isoDateSchema = z.iso.datetime();

// A user-authored highlight, mirroring PdfHighlightAnnoObject. `looseObject`
// keeps forward-compatible fields the reader may add without forcing a schema
// bump, while the explicit fields below are the ones we validate and bound.
export const highlightAnnotationSchema = z.looseObject({
  id: z.string().trim().min(1).max(128),
  type: z.literal(HIGHLIGHT_SUBTYPE),
  pageIndex: z.number().int().min(0),
  rect: rectSchema,
  segmentRects: z.array(rectSchema).min(1).max(MAX_SEGMENT_RECTS),
  opacity: z.number().min(0).max(1),
  strokeColor: hexColorSchema.optional(),
  color: hexColorSchema.optional(),
  contents: z
    .string()
    .max(
      LIMITS.libraryAnnotationNoteMax,
      validationMessage("Validation.library.noteMaxLength"),
    )
    .optional(),
  author: z.string().max(200).optional(),
  flags: z.array(z.string().max(40)).max(20).optional(),
  created: isoDateSchema.optional(),
  modified: isoDateSchema.optional(),
  // PdfBlendMode is a numeric enum (0–15), not a string.
  blendMode: z.number().int().min(0).max(15).optional(),
});

export type HighlightAnnotationInput = z.infer<
  typeof highlightAnnotationSchema
>;

export const saveAnnotationSchema = z.object({
  bookId: z.string().trim().min(1),
  annotation: highlightAnnotationSchema,
});

export type SaveAnnotationForm = z.infer<typeof saveAnnotationSchema>;

export const deleteAnnotationSchema = z.object({
  bookId: z.string().trim().min(1),
  annotationUid: z.string().trim().min(1).max(128),
});

export type DeleteAnnotationForm = z.infer<typeof deleteAnnotationSchema>;
