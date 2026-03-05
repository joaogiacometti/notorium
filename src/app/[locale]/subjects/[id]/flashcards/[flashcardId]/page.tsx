import { notFound } from "next/navigation";
import { getFlashcardById } from "@/app/actions/flashcards";
import { FlashcardDetail } from "@/components/flashcard-detail";
import { requireSession } from "@/lib/auth";

interface FlashcardPageProps {
  params: Promise<{ id: string; flashcardId: string }>;
}

export default async function FlashcardPage({ params }: FlashcardPageProps) {
  await requireSession();

  const { id, flashcardId } = await params;
  const flashcard = await getFlashcardById(flashcardId);

  if (!flashcard || flashcard.subjectId !== id) {
    notFound();
  }

  return (
    <main>
      <FlashcardDetail flashcard={flashcard} />
    </main>
  );
}
