import { redirect } from "next/navigation";
import { FlashcardExamSession } from "@/components/flashcards/review/flashcard-exam-session";
import { shuffleExamCards } from "@/features/flashcard-review/exam";
import { getAllFlashcardsForExam } from "@/features/flashcard-review/queries";
import { resolveScopedFolderId } from "@/features/flashcards/scope";
import { getAllFoldersWithPathsForUser } from "@/features/folders/queries";
import { requireSession } from "@/lib/auth/auth";
import { getFlashcardsHref } from "@/lib/navigation/detail-page-back-link";

interface FlashcardExamPageProps {
  searchParams: Promise<{ folderId?: string }>;
}

export default async function FlashcardExamPage({
  searchParams,
}: Readonly<FlashcardExamPageProps>) {
  const session = await requireSession();
  const { folderId } = await searchParams;
  const folders = await getAllFoldersWithPathsForUser(session.user.id);
  const scopedFolderId = resolveScopedFolderId(folders, folderId);

  const cards = await getAllFlashcardsForExam(session.user.id, {
    folderId: scopedFolderId,
  });

  if (cards.length === 0) {
    redirect(getFlashcardsHref("review", scopedFolderId));
  }

  // Shuffled here, not in the client, so the server-rendered and hydrated
  // card order match.
  return (
    <FlashcardExamSession
      key={scopedFolderId ?? "all"}
      initialCards={shuffleExamCards(cards)}
      folders={folders}
      folderId={scopedFolderId}
    />
  );
}
