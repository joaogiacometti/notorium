import { FlashcardReviewClient } from "@/components/flashcards/flashcard-review-client";
import { FlashcardsManager } from "@/components/flashcards/flashcards-manager";
import { FlashcardsPageShell } from "@/components/flashcards/flashcards-page-shell";
import { getDecksBySubjectForUser } from "@/features/decks/queries";
import { getFlashcardReviewStateForUser } from "@/features/flashcard-review/queries";
import { getFlashcardsManagePageForUser } from "@/features/flashcards/queries";
import { resolveFlashcardsView } from "@/features/flashcards/view";
import { getSubjectsForUser } from "@/features/subjects/queries";
import { requireSession } from "@/lib/auth/auth";

interface FlashcardsPageProps {
  searchParams: Promise<{ view?: string; subjectId?: string; deckId?: string }>;
}

export default async function FlashcardsPage({
  searchParams,
}: Readonly<FlashcardsPageProps>) {
  const session = await requireSession();
  const { view, subjectId, deckId } = await searchParams;
  const currentView = resolveFlashcardsView(view);
  const subjects = await getSubjectsForUser(session.user.id);

  const scopedSubjectId = subjects.some((subject) => subject.id === subjectId)
    ? subjectId
    : undefined;

  const decks = scopedSubjectId
    ? await getDecksBySubjectForUser(session.user.id, scopedSubjectId)
    : [];

  const scopedDeckId =
    deckId && decks.some((deck) => deck.id === deckId) ? deckId : undefined;

  if (currentView === "review") {
    const reviewState = await getFlashcardReviewStateForUser(session.user.id, {
      subjectId: scopedSubjectId,
      deckId: scopedDeckId,
      limit: 50,
    });
    const dueCount = reviewState.summary.dueCount;
    const totalCount = reviewState.summary.totalCount;
    const headerMeta =
      dueCount === 0
        ? "No cards due right now."
        : `${dueCount} due of ${totalCount} total cards.`;

    return (
      <FlashcardsPageShell
        currentView={currentView}
        description="Manage all your flashcards or switch to due-card review."
        headerMeta={headerMeta}
        manageLabel="Manage"
        reviewLabel="Review"
        title="Flashcards"
      >
        <FlashcardReviewClient
          initialState={reviewState}
          subjects={subjects}
          subjectId={scopedSubjectId}
          deckId={scopedDeckId}
          decks={decks}
          embedded
        />
      </FlashcardsPageShell>
    );
  }

  const initialPageData = await getFlashcardsManagePageForUser(
    session.user.id,
    {
      pageIndex: 0,
      pageSize: 25,
      subjectId: scopedSubjectId,
      deckId: scopedDeckId,
      search: "",
    },
  );

  return (
    <FlashcardsPageShell
      currentView={currentView}
      description="Manage all your flashcards or switch to due-card review."
      manageLabel="Manage"
      reviewLabel="Review"
      title="Flashcards"
    >
      <FlashcardsManager
        initialPageData={initialPageData}
        subjects={subjects}
        decks={decks}
        initialSubjectId={scopedSubjectId}
        initialDeckId={scopedDeckId}
      />
    </FlashcardsPageShell>
  );
}
