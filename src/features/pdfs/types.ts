import type { InferSelectModel } from "drizzle-orm";
import type { pdfDocument } from "@/db/schema";
import type { ActionErrorResult } from "@/lib/server/server-action-errors";

export type PdfDocumentEntity = InferSelectModel<typeof pdfDocument>;

export type PdfListItem = Pick<
  PdfDocumentEntity,
  "id" | "title" | "updatedAt" | "subjectId"
>;

/** Token and server-chosen pathname for one direct browser-to-storage upload. */
export type PreparePdfUploadResult =
  | { success: true; pathname: string; clientToken: string }
  | ActionErrorResult;

export type CreatePdfResult =
  | { success: true; subjectId: string; pdfId: string }
  | ActionErrorResult;

export type PdfMutationResult =
  | { success: true; subjectId: string }
  | ActionErrorResult;
