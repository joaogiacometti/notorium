import { notFound } from "next/navigation";
import { FlashcardDetail } from "@/components/flashcard-detail";
import { getFlashcardByIdForUser } from "@/features/flashcards/queries";
import { requireSession } from "@/lib/auth";

interface FlashcardPageProps {
  params: Promise<{ id: string; flashcardId: string }>;
}

export default async function FlashcardPage({ params }: FlashcardPageProps) {
  const session = await requireSession();

  const { id, flashcardId } = await params;
  const flashcard = await getFlashcardByIdForUser(session.user.id, flashcardId);

  if (!flashcard || flashcard.subjectId !== id) {
    notFound();
  }

  return (
    <main>
      <FlashcardDetail flashcard={flashcard} />
    </main>
  );
}
