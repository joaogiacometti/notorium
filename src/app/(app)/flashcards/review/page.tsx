import { redirect } from "next/navigation";
import { FlashcardReviewSession } from "@/components/flashcards/review/flashcard-review-session";
import { getFlashcardReviewStateForUser } from "@/features/flashcard-review/queries";
import { resolveScopedFolderId } from "@/features/flashcards/scope";
import { getAllFoldersWithPathsForUser } from "@/features/folders/queries";
import { requireSession } from "@/lib/auth/auth";
import { getFlashcardsHref } from "@/lib/navigation/detail-page-back-link";

interface FlashcardReviewPageProps {
  searchParams: Promise<{ folderId?: string }>;
}

export default async function FlashcardReviewPage({
  searchParams,
}: Readonly<FlashcardReviewPageProps>) {
  const session = await requireSession();
  const { folderId } = await searchParams;
  const folders = await getAllFoldersWithPathsForUser(session.user.id);
  const scopedFolderId = resolveScopedFolderId(folders, folderId);

  const initialState = await getFlashcardReviewStateForUser(session.user.id, {
    folderId: scopedFolderId,
    limit: 50,
  });

  if (initialState.summary.dueCount === 0) {
    redirect(getFlashcardsHref("review", scopedFolderId));
  }

  return (
    <FlashcardReviewSession
      key={scopedFolderId ?? "all"}
      initialState={initialState}
      folders={folders}
      folderId={scopedFolderId}
    />
  );
}
