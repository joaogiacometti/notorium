"use client";

import { put } from "@vercel/blob/client";
import { createPdf, preparePdfUpload } from "@/app/actions/pdfs";
import type { CreatePdfResult } from "@/features/pdfs/types";
import { PDF_MIME_TYPE } from "@/features/pdfs/validation";
import { actionError } from "@/lib/server/server-action-errors";

// Above this size the file is sent in parallel, retried parts.
const MULTIPART_THRESHOLD_BYTES = 8 * 1024 * 1024;

export interface PdfStorageUpload {
  pathname: string;
  clientToken: string;
  file: File;
  onProgress: (percentage: number) => void;
}

export interface PdfUploadSteps {
  prepare: typeof preparePdfUpload;
  uploadFile: (upload: PdfStorageUpload) => Promise<void>;
  create: typeof createPdf;
}

export interface UploadPdfDocumentInput {
  subjectId: string;
  title: string;
  file: File;
  onProgress: (percentage: number) => void;
}

async function uploadFileToStorage(upload: PdfStorageUpload): Promise<void> {
  await put(upload.pathname, upload.file, {
    access: "private",
    token: upload.clientToken,
    contentType: PDF_MIME_TYPE,
    multipart: upload.file.size > MULTIPART_THRESHOLD_BYTES,
    onUploadProgress: (event) => upload.onProgress(event.percentage),
  });
}

const defaultSteps: PdfUploadSteps = {
  prepare: preparePdfUpload,
  uploadFile: uploadFileToStorage,
  create: createPdf,
};

/**
 * Uploads a PDF straight from the browser to media storage, then registers it
 * as a document. Never throws: failures resolve to an error result the caller
 * shows with `t(result.errorCode, result.errorParams)`.
 *
 * @example
 * const result = await uploadPdfDocument({ subjectId, title, file, onProgress });
 */
export async function uploadPdfDocument(
  input: UploadPdfDocumentInput,
  steps: PdfUploadSteps = defaultSteps,
): Promise<CreatePdfResult> {
  const prepared = await steps.prepare({
    subjectId: input.subjectId,
    fileName: input.file.name,
    sizeBytes: input.file.size,
  });
  if (!prepared.success) {
    return prepared;
  }

  try {
    await steps.uploadFile({
      pathname: prepared.pathname,
      clientToken: prepared.clientToken,
      file: input.file,
      onProgress: input.onProgress,
    });
  } catch {
    return actionError("attachments.uploadFailed");
  }

  return steps.create({
    subjectId: input.subjectId,
    title: input.title,
    fileName: input.file.name,
    blobPathname: prepared.pathname,
  });
}
