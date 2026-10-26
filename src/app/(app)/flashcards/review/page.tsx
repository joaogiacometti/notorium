import { redirect } from "next/navigation";
import { FlashcardReviewSession } from "@/components/flashcards/review/flashcard-review-session";
import { getFlashcardReviewStateForUser } from "@/features/flashcard-review/queries";
import { resolveScopedSubjectId } from "@/features/flashcards/scope";
import { getAllSubjectsWithPathsForUser } from "@/features/subjects/queries";
import { isAiEnabled } from "@/lib/ai/config";
import { requireSession } from "@/lib/auth/auth";
import { getFlashcardsHref } from "@/lib/navigation/detail-page-back-link";

interface FlashcardReviewPageProps {
  searchParams: Promise<{ subjectId?: string }>;
}

export default async function FlashcardReviewPage({
  searchParams,
}: Readonly<FlashcardReviewPageProps>) {
  const session = await requireSession();
  const { subjectId } = await searchParams;
  const subjects = await getAllSubjectsWithPathsForUser(session.user.id);
  const scopedSubjectId = resolveScopedSubjectId(subjects, subjectId);

  const initialState = await getFlashcardReviewStateForUser(session.user.id, {
    subjectId: scopedSubjectId,
    limit: 50,
  });

  if (initialState.summary.dueCount === 0) {
    redirect(getFlashcardsHref("review", scopedSubjectId));
  }

  return (
    <FlashcardReviewSession
      key={scopedSubjectId ?? "all"}
      initialState={initialState}
      subjects={subjects}
      subjectId={scopedSubjectId}
      aiEnabled={isAiEnabled()}
    />
  );
}
