import { z } from "zod";
import { LIMITS } from "@/lib/config/limits";
import { validationMessage } from "@/lib/validations/validation-messages";

export const PDF_MIME_TYPE = "application/pdf";

const pdfTitleSchema = z
  .string()
  .trim()
  .min(1, validationMessage("Validation.pdfs.titleRequired"))
  .max(LIMITS.pdfTitleMax, validationMessage("Validation.pdfs.titleMaxLength"));

const pdfFileNameSchema = z.string().min(1).max(LIMITS.pdfFileNameMax);

export const preparePdfUploadSchema = z.object({
  subjectId: z.string().min(1),
  fileName: pdfFileNameSchema,
  sizeBytes: z.number().int().positive(),
});

export type PreparePdfUploadForm = z.infer<typeof preparePdfUploadSchema>;

export const createPdfSchema = z.object({
  subjectId: z.string().min(1),
  title: pdfTitleSchema,
  fileName: pdfFileNameSchema,
  blobPathname: z.string().min(1).max(512),
});

export type CreatePdfForm = z.infer<typeof createPdfSchema>;

export const renamePdfSchema = z.object({
  id: z.string().min(1),
  title: pdfTitleSchema,
});

export type RenamePdfForm = z.infer<typeof renamePdfSchema>;

export const deletePdfSchema = z.object({
  id: z.string().min(1),
});

export type DeletePdfForm = z.infer<typeof deletePdfSchema>;

export const savePdfReadingPageSchema = z.object({
  id: z.string().min(1),
  page: z.number().int().min(1),
  pageCount: z.number().int().min(1),
});

export type SavePdfReadingPageForm = z.infer<typeof savePdfReadingPageSchema>;

/** Title-only client form for the Rename dialog. */
export const pdfTitleFormSchema = renamePdfSchema.pick({ title: true });

/** Client form for the Add PDF dialog; the file is checked separately. */
export const createPdfFormSchema = createPdfSchema.pick({
  subjectId: true,
  title: true,
});

export type CreatePdfFormValues = z.infer<typeof createPdfFormSchema>;
