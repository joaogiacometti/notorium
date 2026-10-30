import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/index";
import { pdfDocument } from "@/db/schema";
import { moveDocumentForUser } from "@/features/documents/move-target";
import type {
  MoveDocumentMutationInput,
  MoveDocumentResult,
} from "@/features/documents/types";
import { pdfCapacityRule } from "@/features/pdfs/capacity";
import { getPdfByIdForUser } from "@/features/pdfs/queries";
import type { PdfMutationResult } from "@/features/pdfs/types";
import type {
  DeletePdfForm,
  RenamePdfForm,
  SavePdfReadingPageForm,
} from "@/features/pdfs/validation";
import { actionError } from "@/lib/server/server-action-errors";

function ownedPdfFilter(userId: string, pdfId: string) {
  return and(eq(pdfDocument.id, pdfId), eq(pdfDocument.userId, userId));
}

export async function renamePdfForUser(
  userId: string,
  data: RenamePdfForm,
): Promise<PdfMutationResult> {
  const existing = await getPdfByIdForUser(userId, data.id);
  if (!existing) {
    return actionError("pdfs.notFound");
  }

  await getDb()
    .update(pdfDocument)
    .set({ title: data.title })
    .where(ownedPdfFilter(userId, data.id));

  return { success: true, subjectId: existing.subjectId };
}

/**
 * Reparents a PDF to another subject (tree drag-and-drop), enforcing ownership
 * and the destination's PDF limit.
 */
export function movePdfForUser(
  userId: string,
  data: MoveDocumentMutationInput,
): Promise<MoveDocumentResult> {
  return moveDocumentForUser(userId, data, {
    findSubjectId: async (ownerId, id) =>
      (await getPdfByIdForUser(ownerId, id))?.subjectId ?? null,
    notFoundCode: "pdfs.notFound",
    rule: pdfCapacityRule,
    reparent: async (ownerId, id, subjectId) => {
      await getDb()
        .update(pdfDocument)
        .set({ subjectId })
        .where(ownedPdfFilter(ownerId, id));
    },
  });
}

/** Deletes the record; the stored file is left to the orphan blob sweep. */
export async function deletePdfForUser(
  userId: string,
  data: DeletePdfForm,
): Promise<PdfMutationResult> {
  const existing = await getPdfByIdForUser(userId, data.id);
  if (!existing) {
    return actionError("pdfs.notFound");
  }

  await getDb().delete(pdfDocument).where(ownedPdfFilter(userId, data.id));

  return { success: true, subjectId: existing.subjectId };
}

/**
 * Stores the reader's current page and the document's page count. Keeps
 * `updatedAt` as is so reading never reorders document lists.
 *
 * @example
 * await savePdfReadingPageForUser(userId, { id, page: 12, pageCount: 340 });
 */
export async function savePdfReadingPageForUser(
  userId: string,
  data: SavePdfReadingPageForm,
): Promise<PdfMutationResult> {
  const saved = await getDb()
    .update(pdfDocument)
    .set({
      lastPage: Math.min(data.page, data.pageCount),
      pageCount: data.pageCount,
      updatedAt: sql`${pdfDocument.updatedAt}`,
    })
    .where(ownedPdfFilter(userId, data.id))
    .returning({ subjectId: pdfDocument.subjectId });

  const row = saved[0];
  return row
    ? { success: true, subjectId: row.subjectId }
    : actionError("pdfs.notFound");
}
