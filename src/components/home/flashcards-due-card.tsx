import { Layers } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FlashcardReviewSummary } from "@/lib/server/api-contracts";

interface FlashcardsDueCardProps {
  summary: FlashcardReviewSummary;
}

/**
 * Dashboard card showing how many flashcards are due for review now, linking
 * into the review flow.
 */
export function FlashcardsDueCard({
  summary,
}: Readonly<FlashcardsDueCardProps>) {
  const caughtUp = summary.dueCount === 0;

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0">
        <Layers className="size-4 text-muted-foreground" />
        <CardTitle className="text-base">Flashcards due</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-1.5">
        <p className="text-3xl font-semibold text-foreground">
          {summary.dueCount}
        </p>
        <p className="text-sm text-muted-foreground">
          {caughtUp
            ? "You're all caught up."
            : `of ${summary.totalCount} cards ready to review`}
        </p>
        <Link
          href="/flashcards"
          className="mt-auto inline-block pt-1 text-sm font-medium text-primary hover:underline"
        >
          {caughtUp ? "Browse flashcards →" : "Review now →"}
        </Link>
      </CardContent>
    </Card>
  );
}
