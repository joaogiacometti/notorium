import { and, count, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/index";
import { folder, pdfDocument } from "@/db/schema";
import type { PdfDocumentEntity, PdfListItem } from "@/features/pdfs/types";

const pdfListColumns = {
  id: pdfDocument.id,
  title: pdfDocument.title,
  updatedAt: pdfDocument.updatedAt,
  folderId: pdfDocument.folderId,
};

export async function getPdfsByFolderForUser(
  userId: string,
  folderId: string,
): Promise<PdfListItem[]> {
  return getDb()
    .select(pdfListColumns)
    .from(pdfDocument)
    .innerJoin(folder, eq(pdfDocument.folderId, folder.id))
    .where(
      and(
        eq(pdfDocument.folderId, folderId),
        eq(pdfDocument.userId, userId),
        eq(folder.userId, userId),
      ),
    )
    .orderBy(desc(pdfDocument.updatedAt));
}

/** Most recently updated PDFs for the home dashboard's recent documents card. */
export async function getRecentPdfsForUser(
  userId: string,
  limit: number,
): Promise<PdfListItem[]> {
  return getDb()
    .select(pdfListColumns)
    .from(pdfDocument)
    .innerJoin(folder, eq(pdfDocument.folderId, folder.id))
    .where(and(eq(pdfDocument.userId, userId), eq(folder.userId, userId)))
    .orderBy(desc(pdfDocument.updatedAt))
    .limit(limit);
}

export async function getPdfByIdForUser(
  userId: string,
  pdfId: string,
): Promise<PdfDocumentEntity | null> {
  const results = await getDb()
    .select({ pdfDocument })
    .from(pdfDocument)
    .innerJoin(folder, eq(pdfDocument.folderId, folder.id))
    .where(
      and(
        eq(pdfDocument.id, pdfId),
        eq(pdfDocument.userId, userId),
        eq(folder.userId, userId),
      ),
    )
    .limit(1);

  return results[0]?.pdfDocument ?? null;
}

export async function countPdfsByFolderForUser(
  userId: string,
  folderId: string,
): Promise<number> {
  const result = await getDb()
    .select({ total: count() })
    .from(pdfDocument)
    .innerJoin(folder, eq(pdfDocument.folderId, folder.id))
    .where(
      and(
        eq(pdfDocument.folderId, folderId),
        eq(pdfDocument.userId, userId),
        eq(folder.userId, userId),
      ),
    );

  return result[0]?.total ?? 0;
}
