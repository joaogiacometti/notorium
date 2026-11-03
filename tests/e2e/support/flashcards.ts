import { getDb } from "@/db/index";
import { flashcard } from "@/db/schema";
import { documentText } from "@/lib/editor/document";
import { documentUniquenessText } from "@/lib/editor/document-content";
import { testDocument } from "@/test/document";

export async function createFlashcardForSubject(
  userId: string,
  subjectId: string,
  front: string,
  back: string,
  dueAt: Date = new Date(Date.now() - 86_400_000),
): Promise<{ id: string }> {
  const [newFlashcard] = await getDb()
    .insert(flashcard)
    .values({
      userId,
      subjectId,
      front: testDocument(front),
      frontText: documentText(testDocument(front)),
      frontNormalized: documentUniquenessText(testDocument(front)),
      back: testDocument(back),
      backText: documentText(testDocument(back)),
      dueAt,
    })
    .returning({ id: flashcard.id });

  return newFlashcard;
}
