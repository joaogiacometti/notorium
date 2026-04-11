import { redirect } from "next/navigation";
import { FlashcardDetail } from "@/components/flashcards/flashcard-detail";
import { getFlashcardDetailByIdForUser } from "@/features/flashcards/queries";
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
}: Readonly<FlashcardPageProps>) {
  const session = await requireSession();

  const { id, flashcardId } = await params;
  const returnContext = await searchParams;
  const [flashcard, subjects] = await Promise.all([
    getFlashcardDetailByIdForUser(session.user.id, flashcardId),
    getSubjectsForUser(session.user.id),
  ]);

  const backLink = resolveFlashcardDetailBackLink(returnContext, id);

  if (!flashcard) {
    redirect(backLink.href);
  }

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
