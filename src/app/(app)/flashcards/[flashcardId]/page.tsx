import { redirect } from "next/navigation";
import { FlashcardDetail } from "@/components/flashcards/flashcard-detail";
import { getFlashcardDetailByIdForUser } from "@/features/flashcards/queries";
import { requireSession } from "@/lib/auth/auth";
import { resolveFlashcardDetailBackLink } from "@/lib/navigation/detail-page-back-link";

interface FlashcardDetailPageProps {
  params: Promise<{ flashcardId: string }>;
  searchParams: Promise<{ from?: string; view?: string; deckId?: string }>;
}

export default async function FlashcardDetailPage({
  params,
  searchParams,
}: Readonly<FlashcardDetailPageProps>) {
  const session = await requireSession();
  const { flashcardId } = await params;
  const returnContext = await searchParams;

  const flashcard = await getFlashcardDetailByIdForUser(
    session.user.id,
    flashcardId,
  );

  const backLink = resolveFlashcardDetailBackLink(returnContext);

  if (!flashcard) {
    redirect(backLink.href);
  }

  return (
    <main>
      <FlashcardDetail
        backHref={backLink.href}
        backLabel={backLink.label}
        flashcard={flashcard}
      />
    </main>
  );
}
