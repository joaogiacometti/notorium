import {
  getDueFlashcards,
  getFlashcardReviewSummary,
} from "@/app/actions/flashcard-review";
import { FlashcardReviewClient } from "@/components/flashcard-review-client";
import { requireSession } from "@/lib/auth";

interface FlashcardReviewPageProps {
  searchParams: Promise<{ subjectId?: string }>;
}

export default async function FlashcardReviewPage({
  searchParams,
}: Readonly<FlashcardReviewPageProps>) {
  await requireSession();

  const { subjectId } = await searchParams;
  const scopedSubjectId = typeof subjectId === "string" ? subjectId : undefined;

  const [dueCards, summary] = await Promise.all([
    getDueFlashcards({ subjectId: scopedSubjectId, limit: 50 }),
    getFlashcardReviewSummary({ subjectId: scopedSubjectId }),
  ]);

  return (
    <main>
      <FlashcardReviewClient
        initialCards={dueCards}
        initialSummary={summary}
        subjectId={scopedSubjectId}
      />
    </main>
  );
}
