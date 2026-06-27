import { Suspense } from "react";
import { FlashcardsDueCard } from "@/components/home/flashcards-due-card";
import { HomeGreeting } from "@/components/home/home-greeting";
import { RecentBooksCard } from "@/components/home/recent-books-card";
import { RecentDocumentsCard } from "@/components/home/recent-documents-card";
import {
  ReviewActivityCard,
  ReviewActivityCardSkeleton,
} from "@/components/home/review-activity-card";
import { UpcomingAssessmentsCard } from "@/components/home/upcoming-assessments-card";
import { FeaturePageShell } from "@/components/shared/feature-page-shell";
import { getUpcomingAssessmentsForUser } from "@/features/assessments/queries";
import { getRecentDocumentsForUser } from "@/features/documents/queries";
import {
  getFlashcardReviewActivityForUser,
  getFlashcardReviewSummaryForUser,
} from "@/features/flashcard-review/queries";
import { getRecentBooksForUser } from "@/features/library/queries";
import { requireSession } from "@/lib/auth/auth";

export default async function HomePage() {
  const session = await requireSession();
  const userId = session.user.id;
  const now = new Date();

  const reviewActivityPromise = getFlashcardReviewActivityForUser(userId, now);
  const [summary, upcomingAssessments, recentDocuments, recentBooks] =
    await Promise.all([
      getFlashcardReviewSummaryForUser(userId, now),
      getUpcomingAssessmentsForUser(userId, 3),
      getRecentDocumentsForUser(userId, 6),
      getRecentBooksForUser(userId, 6),
    ]);

  const name = session.user.name?.trim() || session.user.email || "there";

  return (
    <FeaturePageShell title="Home" icon="home" isolateContentScroll>
      <div
        data-testid="home-dashboard"
        className="space-y-4 lg:h-full lg:overflow-y-auto lg:pr-1"
      >
        <HomeGreeting name={name} />
        <div className="grid gap-3 lg:grid-cols-2">
          <FlashcardsDueCard summary={summary} />
          <UpcomingAssessmentsCard assessments={upcomingAssessments} />
        </div>
        <Suspense fallback={<ReviewActivityCardSkeleton />}>
          <ReviewActivityPanel reviewActivityPromise={reviewActivityPromise} />
        </Suspense>
        <div className="grid gap-3 lg:grid-cols-2">
          <RecentDocumentsCard documents={recentDocuments} />
          <RecentBooksCard books={recentBooks} />
        </div>
      </div>
    </FeaturePageShell>
  );
}

async function ReviewActivityPanel({
  reviewActivityPromise,
}: Readonly<{
  reviewActivityPromise: ReturnType<typeof getFlashcardReviewActivityForUser>;
}>) {
  const reviewActivity = await reviewActivityPromise;

  return (
    <ReviewActivityCard
      heatmap={reviewActivity.heatmap}
      streak={reviewActivity.streak}
    />
  );
}
