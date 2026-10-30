import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/index";
import { pdfDocument } from "@/db/schema";

/** Reads a user's PDF by title, or null when it does not exist. */
export async function getPdfByTitle(userId: string, title: string) {
  const [existingPdf] = await getDb()
    .select({
      id: pdfDocument.id,
      title: pdfDocument.title,
      lastPage: pdfDocument.lastPage,
      pageCount: pdfDocument.pageCount,
      blobPathname: pdfDocument.blobPathname,
    })
    .from(pdfDocument)
    .where(and(eq(pdfDocument.userId, userId), eq(pdfDocument.title, title)))
    .limit(1);

  return existingPdf ?? null;
}
