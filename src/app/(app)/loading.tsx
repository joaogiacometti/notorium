import { FlashcardsDueCardSkeleton } from "@/components/home/flashcards-due-card";
import { RecentDocumentsCardSkeleton } from "@/components/home/recent-documents-card";
import { ReviewActivityCardSkeleton } from "@/components/home/review-activity-card";
import { FeaturePageShell } from "@/components/shared/feature-page-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomeLoading() {
  return (
    <FeaturePageShell title="Home" icon="home">
      <div className="space-y-4 lg:h-full lg:overflow-y-auto lg:pr-1">
        <div className="mb-4 flex h-7 items-center">
          <Skeleton className="h-6 w-56" />
        </div>
        <FlashcardsDueCardSkeleton />
        <ReviewActivityCardSkeleton />
        <RecentDocumentsCardSkeleton />
      </div>
    </FeaturePageShell>
  );
}
