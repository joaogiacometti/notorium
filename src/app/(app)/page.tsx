import { FlashcardsDueCard } from "@/components/home/flashcards-due-card";
import { HomeGreeting } from "@/components/home/home-greeting";
import { RecentDocumentsCard } from "@/components/home/recent-documents-card";
import { SubjectsOverviewCard } from "@/components/home/subjects-overview-card";
import { UpcomingAssessmentsCard } from "@/components/home/upcoming-assessments-card";
import { FeaturePageShell } from "@/components/shared/feature-page-shell";
import { getUpcomingAssessmentsForUser } from "@/features/assessments/queries";
import { getRecentDocumentsForUser } from "@/features/documents/queries";
import { getFlashcardReviewSummaryForUser } from "@/features/flashcard-review/queries";
import { getSubjectListItemsForUser } from "@/features/subjects/queries";
import { requireSession } from "@/lib/auth/auth";

export default async function HomePage() {
  const session = await requireSession();
  const userId = session.user.id;

  const [summary, upcomingAssessments, recentDocuments, subjects] =
    await Promise.all([
      getFlashcardReviewSummaryForUser(userId, new Date()),
      getUpcomingAssessmentsForUser(userId, 5),
      getRecentDocumentsForUser(userId, 6),
      getSubjectListItemsForUser(userId),
    ]);

  const name = session.user.name?.trim() || session.user.email || "there";
  const recentSubjects = [...subjects]
    .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
    .slice(0, 6);

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
        <RecentDocumentsCard documents={recentDocuments} />
        <SubjectsOverviewCard subjects={recentSubjects} />
      </div>
    </FeaturePageShell>
  );
}
