import { notFound } from "next/navigation";
import { FlashcardDetail } from "@/components/flashcards/flashcard-detail";
import { getFlashcardByIdForUser } from "@/features/flashcards/queries";
import { getSubjectsForUser } from "@/features/subjects/queries";
import { requireSession } from "@/lib/auth/auth";
import { resolveFlashcardDetailBackLink } from "@/lib/navigation/detail-page-back-link";

interface FlashcardPageProps {
  params: Promise<{ id: string; flashcardId: string }>;
  searchParams: Promise<{ from?: string; subjectId?: string }>;
}

export default async function FlashcardPage({
  params,
  searchParams,
}: FlashcardPageProps) {
  const session = await requireSession();

  const { id, flashcardId } = await params;
  const returnContext = await searchParams;
  const [flashcard, subjects] = await Promise.all([
    getFlashcardByIdForUser(session.user.id, flashcardId),
    getSubjectsForUser(session.user.id),
  ]);

  if (!flashcard || flashcard.subjectId !== id) {
    notFound();
  }

  const backLink = resolveFlashcardDetailBackLink(
    returnContext,
    flashcard.subjectId,
  );

  return (
    <main>
      <FlashcardDetail
        backHref={backLink.href}
        backLabel={backLink.label}
        flashcard={flashcard}
        subjects={subjects}
      />
    </main>
  );
}
