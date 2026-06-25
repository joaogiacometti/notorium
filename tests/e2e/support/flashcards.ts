import { getDb } from "@/db/index";
import { flashcard } from "@/db/schema";
import { normalizeRichTextForUniqueness } from "@/lib/editor/rich-text";

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
      front,
      frontNormalized: normalizeRichTextForUniqueness(front),
      back,
      dueAt,
    })
    .returning({ id: flashcard.id });

  return newFlashcard;
}
