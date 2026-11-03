import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db/index";
import { flashcard, note, pdfDocument, subject } from "@/db/schema";
import { createFlashcardForUser } from "@/features/flashcards/mutations";
import { MEDIA_STORAGE_CONTEXTS } from "@/lib/media-storage/storage-pathname";
import { createNote, createSubject } from "./db";
import { buildBlankPdf } from "./pdf-file";

export async function seedIsolationData(userId: string, name: string) {
  const home = await createSubject(userId, name);
  const destination = await createSubject(userId, `${name} destination`);
  const createdNote = await createNote(
    userId,
    home.id,
    `${name} note`,
    `<p>${name} private note content</p>`,
  );
  const card = await createFlashcardForUser(userId, {
    subjectId: home.id,
    front: `<p>${name} question</p>`,
    back: `<p>${name} private answer</p>`,
    source: { kind: "note", id: createdNote.id },
  });
  if (!card.success) throw new Error("Could not seed isolation flashcard");
  const media = MEDIA_STORAGE_CONTEXTS.map((context) => ({
    pathname: `notorium/${context}/${userId}/${name}.${context === "pdfs" ? "pdf" : "png"}`,
    bytes:
      context === "pdfs"
        ? buildBlankPdf(2)
        : Buffer.from(`${name} private ${context} image`),
    contentType: context === "pdfs" ? "application/pdf" : "image/png",
  }));
  const pdfBlob = media[2];
  const [pdf] = await getDb()
    .insert(pdfDocument)
    .values({
      userId,
      subjectId: home.id,
      title: `${name} PDF`,
      fileName: "private.pdf",
      blobPathname: pdfBlob.pathname,
      sizeBytes: pdfBlob.bytes.length,
      pageCount: 2,
    })
    .returning();
  return {
    subjectId: home.id,
    destinationId: destination.id,
    noteId: createdNote.id,
    cardId: card.flashcard.id,
    pdfId: pdf.id,
    media,
  };
}

// Read the stored rows directly, not through the ownership helpers under test.
export async function snapshotIsolationData(userId: string) {
  const db = getDb();
  const [subjects, notes, cards, pdfs] = await Promise.all([
    db
      .select()
      .from(subject)
      .where(eq(subject.userId, userId))
      .orderBy(asc(subject.id)),
    db.select().from(note).where(eq(note.userId, userId)).orderBy(asc(note.id)),
    db
      .select()
      .from(flashcard)
      .where(eq(flashcard.userId, userId))
      .orderBy(asc(flashcard.id)),
    db
      .select()
      .from(pdfDocument)
      .where(eq(pdfDocument.userId, userId))
      .orderBy(asc(pdfDocument.id)),
  ]);
  return { subjects, notes, cards, pdfs };
}
