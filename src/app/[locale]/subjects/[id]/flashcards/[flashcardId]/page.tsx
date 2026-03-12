import { notFound } from "next/navigation";
import { FlashcardDetail } from "@/components/flashcards/flashcard-detail";
import { getFlashcardByIdForUser } from "@/features/flashcards/queries";
import { getSubjectsForUser } from "@/features/subjects/queries";
import { requireSession } from "@/lib/auth/auth";

interface FlashcardPageProps {
  params: Promise<{ id: string; flashcardId: string }>;
}

export default async function FlashcardPage({ params }: FlashcardPageProps) {
  const session = await requireSession();

  const { id, flashcardId } = await params;
  const [flashcard, subjects] = await Promise.all([
    getFlashcardByIdForUser(session.user.id, flashcardId),
    getSubjectsForUser(session.user.id),
  ]);

  if (!flashcard || flashcard.subjectId !== id) {
    notFound();
  }

  return (
    <main>
      <FlashcardDetail flashcard={flashcard} subjects={subjects} />
    </main>
  );
}
