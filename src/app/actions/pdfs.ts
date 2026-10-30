"use server";

import {
  deletePdfForUser,
  renamePdfForUser,
  savePdfReadingPageForUser,
} from "@/features/pdfs/mutations";
import type {
  CreatePdfResult,
  PdfMutationResult,
  PreparePdfUploadResult,
} from "@/features/pdfs/types";
import {
  createPdfForUser,
  preparePdfUploadForUser,
} from "@/features/pdfs/upload-mutations";
import {
  type CreatePdfForm,
  createPdfSchema,
  type DeletePdfForm,
  deletePdfSchema,
  type PreparePdfUploadForm,
  preparePdfUploadSchema,
  type RenamePdfForm,
  renamePdfSchema,
  type SavePdfReadingPageForm,
  savePdfReadingPageSchema,
} from "@/features/pdfs/validation";
import { runValidatedUserAction } from "@/lib/server/action-runner";
import { revalidateAppShell } from "@/lib/server/revalidate-views";

/**
 * Issues a client token for one direct browser-to-storage PDF upload. The
 * file bytes never pass through this action, so the 1 MB action body cap and
 * Vercel's function body cap do not apply.
 */
export async function preparePdfUpload(
  data: PreparePdfUploadForm,
): Promise<PreparePdfUploadResult> {
  return runValidatedUserAction(
    "pdfs.preparePdfUpload",
    preparePdfUploadSchema,
    data,
    "pdfs.invalidData",
    (userId, parsedData) => preparePdfUploadForUser(userId, parsedData),
  );
}

export async function createPdf(data: CreatePdfForm): Promise<CreatePdfResult> {
  const result = await runValidatedUserAction(
    "pdfs.createPdf",
    createPdfSchema,
    data,
    "pdfs.invalidData",
    (userId, parsedData) => createPdfForUser(userId, parsedData),
  );

  if (result.success) {
    revalidateAppShell();
  }

  return result;
}

export async function renamePdf(
  data: RenamePdfForm,
): Promise<PdfMutationResult> {
  const result = await runValidatedUserAction(
    "pdfs.renamePdf",
    renamePdfSchema,
    data,
    "pdfs.invalidData",
    (userId, parsedData) => renamePdfForUser(userId, parsedData),
  );

  if (result.success) {
    revalidateAppShell();
  }

  return result;
}

export async function deletePdf(
  data: DeletePdfForm,
): Promise<PdfMutationResult> {
  const result = await runValidatedUserAction(
    "pdfs.deletePdf",
    deletePdfSchema,
    data,
    "pdfs.invalidData",
    (userId, parsedData) => deletePdfForUser(userId, parsedData),
  );

  if (result.success) {
    revalidateAppShell();
  }

  return result;
}

/** Saves the reader's page. Nothing in the app shell shows it, so no revalidation. */
export async function savePdfReadingPage(
  data: SavePdfReadingPageForm,
): Promise<PdfMutationResult> {
  return runValidatedUserAction(
    "pdfs.savePdfReadingPage",
    savePdfReadingPageSchema,
    data,
    "pdfs.invalidData",
    (userId, parsedData) => savePdfReadingPageForUser(userId, parsedData),
  );
}
