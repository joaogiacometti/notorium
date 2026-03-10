import { getTranslations } from "next-intl/server";
import { FlashcardReviewClient } from "@/components/flashcards/flashcard-review-client";
import { FlashcardsManager } from "@/components/flashcards/flashcards-manager";
import { FlashcardsPageShell } from "@/components/flashcards/flashcards-page-shell";
import { getFlashcardReviewState } from "@/features/flashcard-review/server";
import { getFlashcardsForUser } from "@/features/flashcards/queries";
import { resolveFlashcardsView } from "@/features/flashcards/view";
import { getSubjectsForUser } from "@/features/subjects/queries";
import { requireSession } from "@/lib/auth/auth";

interface FlashcardsPageProps {
  searchParams: Promise<{ view?: string; subjectId?: string }>;
}

export default async function FlashcardsPage({
  searchParams,
}: Readonly<FlashcardsPageProps>) {
  const session = await requireSession();
  const t = await getTranslations("FlashcardsPage");
  const { view, subjectId } = await searchParams;
  const currentView = resolveFlashcardsView(view);
  const subjects = await getSubjectsForUser(session.user.id);

  const scopedSubjectId = subjects.some((subject) => subject.id === subjectId)
    ? subjectId
    : undefined;

  if (currentView === "review") {
    const reviewState = await getFlashcardReviewState({
      subjectId: scopedSubjectId,
      limit: 50,
    });

    return (
      <FlashcardsPageShell
        currentView={currentView}
        description={t("description")}
        manageLabel={t("manage")}
        reviewLabel={t("review")}
        subjectId={scopedSubjectId}
        title={t("title")}
      >
        <FlashcardReviewClient
          initialState={reviewState}
          subjectId={scopedSubjectId}
          embedded
        />
      </FlashcardsPageShell>
    );
  }

  const flashcards = await getFlashcardsForUser(session.user.id);

  return (
    <FlashcardsPageShell
      currentView={currentView}
      description={t("description")}
      manageLabel={t("manage")}
      reviewLabel={t("review")}
      subjectId={scopedSubjectId}
      title={t("title")}
    >
      <FlashcardsManager
        flashcards={flashcards}
        subjects={subjects}
        initialSubjectId={scopedSubjectId}
      />
    </FlashcardsPageShell>
  );
}
