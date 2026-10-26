import { redirect } from "next/navigation";
import { FlashcardExamSession } from "@/components/flashcards/review/flashcard-exam-session";
import { shuffleExamCards } from "@/features/flashcard-review/exam";
import { getAllFlashcardsForExam } from "@/features/flashcard-review/queries";
import { resolveScopedSubjectId } from "@/features/flashcards/scope";
import { getAllSubjectsWithPathsForUser } from "@/features/subjects/queries";
import { isAiEnabled } from "@/lib/ai/config";
import { requireSession } from "@/lib/auth/auth";
import { getFlashcardsHref } from "@/lib/navigation/detail-page-back-link";

interface FlashcardExamPageProps {
  searchParams: Promise<{ subjectId?: string }>;
}

export default async function FlashcardExamPage({
  searchParams,
}: Readonly<FlashcardExamPageProps>) {
  const session = await requireSession();
  const { subjectId } = await searchParams;
  const subjects = await getAllSubjectsWithPathsForUser(session.user.id);
  const scopedSubjectId = resolveScopedSubjectId(subjects, subjectId);

  const cards = await getAllFlashcardsForExam(session.user.id, {
    subjectId: scopedSubjectId,
  });

  if (cards.length === 0) {
    redirect(getFlashcardsHref("review", scopedSubjectId));
  }

  // Shuffled here, not in the client, so the server-rendered and hydrated
  // card order match.
  return (
    <FlashcardExamSession
      key={scopedSubjectId ?? "all"}
      initialCards={shuffleExamCards(cards)}
      subjects={subjects}
      subjectId={scopedSubjectId}
      aiEnabled={isAiEnabled()}
    />
  );
}
