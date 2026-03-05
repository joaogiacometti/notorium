import {
  getDueFlashcards,
  getFlashcardReviewSummary,
} from "@/app/actions/flashcard-review";
import { FlashcardReviewClient } from "@/components/flashcard-review-client";
import { requireSession } from "@/lib/auth";
import { getPlanLimits } from "@/lib/plan-limits";

interface FlashcardReviewPageProps {
  searchParams: Promise<{ subjectId?: string }>;
}

export default async function FlashcardReviewPage({
  searchParams,
}: Readonly<FlashcardReviewPageProps>) {
  const session = await requireSession();

  const { subjectId } = await searchParams;
  const scopedSubjectId = typeof subjectId === "string" ? subjectId : undefined;

  const [dueCards, summary] = await Promise.all([
    getDueFlashcards({ subjectId: scopedSubjectId, limit: 50 }),
    getFlashcardReviewSummary({ subjectId: scopedSubjectId }),
  ]);
  const plan = (session.user.plan as "free" | "pro" | "unlimited") ?? "free";
  const flashcardsAllowed = getPlanLimits(plan).flashcardsAllowed;

  return (
    <main>
      <FlashcardReviewClient
        initialCards={dueCards}
        initialSummary={summary}
        subjectId={scopedSubjectId}
        flashcardsAllowed={flashcardsAllowed}
      />
    </main>
  );
}
