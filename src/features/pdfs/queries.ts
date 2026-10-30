import { and, count, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/index";
import { pdfDocument, subject } from "@/db/schema";
import type { PdfDocumentEntity, PdfListItem } from "@/features/pdfs/types";
import { getOwnedActiveSubjectFilters } from "@/features/subjects/query-helpers";

const pdfListColumns = {
  id: pdfDocument.id,
  title: pdfDocument.title,
  updatedAt: pdfDocument.updatedAt,
  subjectId: pdfDocument.subjectId,
};

export async function getPdfsBySubjectForUser(
  userId: string,
  subjectId: string,
): Promise<PdfListItem[]> {
  return getDb()
    .select(pdfListColumns)
    .from(pdfDocument)
    .innerJoin(subject, eq(pdfDocument.subjectId, subject.id))
    .where(
      and(
        eq(pdfDocument.subjectId, subjectId),
        eq(pdfDocument.userId, userId),
        ...getOwnedActiveSubjectFilters(userId),
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
    .innerJoin(subject, eq(pdfDocument.subjectId, subject.id))
    .where(
      and(
        eq(pdfDocument.userId, userId),
        ...getOwnedActiveSubjectFilters(userId),
      ),
    )
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
    .innerJoin(subject, eq(pdfDocument.subjectId, subject.id))
    .where(
      and(
        eq(pdfDocument.id, pdfId),
        eq(pdfDocument.userId, userId),
        ...getOwnedActiveSubjectFilters(userId),
      ),
    )
    .limit(1);

  return results[0]?.pdfDocument ?? null;
}

export async function countPdfsBySubjectForUser(
  userId: string,
  subjectId: string,
): Promise<number> {
  const result = await getDb()
    .select({ total: count() })
    .from(pdfDocument)
    .innerJoin(subject, eq(pdfDocument.subjectId, subject.id))
    .where(
      and(
        eq(pdfDocument.subjectId, subjectId),
        eq(pdfDocument.userId, userId),
        ...getOwnedActiveSubjectFilters(userId),
      ),
    );

  return result[0]?.total ?? 0;
}
