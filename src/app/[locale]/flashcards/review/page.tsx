import { getFlashcardReviewState } from "@/app/actions/flashcard-review";
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
  const initialState = await getFlashcardReviewState({
    subjectId: scopedSubjectId,
    limit: 50,
  });

  return (
    <main>
      <FlashcardReviewClient
        initialState={initialState}
        subjectId={scopedSubjectId}
      />
    </main>
  );
}
