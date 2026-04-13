import { BarChart3, CheckCircle2 } from "lucide-react";
import { FlashcardsStatisticsFilters } from "@/components/flashcards/shared/flashcards-statistics-filters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFlashcardStudyHealth } from "@/features/flashcards/statistics-health";
import type {
  DeckEntity,
  FlashcardStatisticsState,
  SubjectEntity,
} from "@/lib/server/api-contracts";
import { getStatusToneClasses } from "@/lib/ui/status-tones";

interface FlashcardsStatisticsProps {
  statistics: FlashcardStatisticsState;
  subjects: SubjectEntity[];
  decks: DeckEntity[];
  subjectId?: string;
  deckId?: string;
}

const stateColors: Record<string, string> = {
  new: "bg-[var(--chart-1)]",
  learning: "bg-[var(--chart-2)]",
  review: "bg-[var(--chart-3)]",
  relearning: "bg-[var(--chart-4)]",
};

const ratingColors: Record<string, string> = {
  again: "bg-[var(--status-danger-fill)]",
  hard: "bg-[var(--status-warning-fill)]",
  good: "bg-[var(--chart-3)]",
  easy: "bg-[var(--status-success-fill)]",
};

function formatTrendLabel(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T00:00:00.000Z`));
}

function HealthSecondaryStat({
  label,
  value,
}: Readonly<{
  label: string;
  value: string;
}>) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/60 px-3 py-2">
      <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold leading-none">{value}</p>
    </div>
  );
}

function BreakdownSection({
  title,
  items,
  total,
  colors,
  emptyLabel,
}: Readonly<{
  title: string;
  items: FlashcardStatisticsState["states"];
  total: number;
  colors: Record<string, string>;
  emptyLabel: string;
}>) {
  return (
    <Card className="gap-0 rounded-xl border-border/70 py-0 shadow-none">
      <CardHeader className="px-4 pt-3 pb-0">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5 p-4">
        {total === 0 ? (
          <p className="text-xs text-muted-foreground">{emptyLabel}</p>
        ) : (
          items.map((item) => {
            const percentage = total > 0 ? (item.count / total) * 100 : 0;

            return (
              <div key={item.key} className="space-y-1">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={`size-2.5 shrink-0 rounded-full ${colors[item.key] ?? "bg-chart-5"}`}
                    />
                    <span className="truncate font-medium">{item.label}</span>
                  </div>
                  <span className="shrink-0 text-muted-foreground">
                    {item.count}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${colors[item.key] ?? "bg-chart-5"}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

function TrendSection({
  points,
}: Readonly<{
  points: FlashcardStatisticsState["trend"];
}>) {
  const maxCount = Math.max(...points.map((point) => point.count), 1);
  const hasReviews = points.some((point) => point.count > 0);

  return (
    <Card className="gap-0 rounded-xl border-border/70 py-0 shadow-none">
      <CardHeader className="px-4 pt-3 pb-0">
        <CardTitle className="text-sm">Recent activity</CardTitle>
      </CardHeader>
      <CardContent className="flex h-full flex-col p-4">
        {hasReviews ? (
          <div className="grid flex-1 grid-cols-7 gap-1.5">
            {points.map((point) => (
              <div
                key={point.date}
                className="flex min-w-0 flex-col items-center gap-1"
              >
                <div className="flex h-22 w-full items-end justify-center rounded-md border border-border/70 bg-background/80 px-0.75 py-1">
                  <div
                    className="w-full rounded-sm bg-chart-2 transition-[height]"
                    style={{
                      height: `${Math.max((point.count / maxCount) * 100, point.count > 0 ? 14 : 0)}%`,
                    }}
                  />
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium">{point.count}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatTrendLabel(point.date)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            No review activity in the last 7 days.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function FlashcardsStatistics({
  statistics,
  subjects,
  decks,
  subjectId,
  deckId,
}: Readonly<FlashcardsStatisticsProps>) {
  const { summary, states, ratings, trend } = statistics;
  const studyHealth = getFlashcardStudyHealth(summary);
  const studyHealthTone = getStatusToneClasses(studyHealth.tone);

  return (
    <div className="flex flex-col gap-3 lg:h-full lg:min-h-0">
      <FlashcardsStatisticsFilters
        subjects={subjects}
        decks={decks}
        subjectId={subjectId}
        deckId={deckId}
      />

      <div
        className="grid gap-3 lg:min-h-0 lg:grid-rows-[auto_1fr]"
        data-testid="flashcards-statistics"
      >
        <div className="grid gap-3 xl:grid-cols-2">
          <Card className="gap-0 rounded-2xl border-border/70 py-0 shadow-none">
            <CardContent className="flex h-full flex-col justify-between gap-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                    Study health
                  </p>
                  <div className="flex items-end gap-2">
                    <p className="text-4xl font-semibold leading-none tracking-tight">
                      {studyHealth.score}
                    </p>
                    <span className="pb-1 text-xs font-medium text-muted-foreground">
                      /100
                    </span>
                  </div>
                </div>
                <div
                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${studyHealthTone.border} ${studyHealthTone.bg} ${studyHealthTone.text}`}
                >
                  <CheckCircle2 className="mr-1 size-3.5" />
                  {studyHealth.label}
                </div>
              </div>

              <div className="space-y-2">
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${studyHealthTone.fill}`}
                    style={{ width: `${studyHealth.score}%` }}
                  />
                </div>
                <p className="text-xs leading-5 text-muted-foreground">
                  {studyHealth.detail}
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <HealthSecondaryStat
                  label="Cards"
                  value={summary.totalCards.toString()}
                />
                <HealthSecondaryStat
                  label="Due now"
                  value={summary.dueCards.toString()}
                />
                <HealthSecondaryStat
                  label="Reviewed"
                  value={summary.reviewedCards.toString()}
                />
                <HealthSecondaryStat
                  label="Untouched"
                  value={summary.neverReviewedCards.toString()}
                />
              </div>
            </CardContent>
          </Card>
          <BreakdownSection
            title="Card states"
            items={states}
            total={summary.totalCards}
            colors={stateColors}
            emptyLabel="No card-state data available."
          />
        </div>

        <div className="grid gap-3 xl:grid-cols-2 xl:overflow-hidden">
          <BreakdownSection
            title="Review ratings"
            items={ratings}
            total={summary.totalReviews}
            colors={ratingColors}
            emptyLabel="No review ratings recorded yet."
          />
          {summary.totalCards === 0 ? (
            <Card className="gap-0 rounded-xl border-border/70 py-0 shadow-none">
              <CardContent className="flex h-full flex-col justify-center gap-2 p-6">
                <div className="flex items-center gap-2 text-base font-semibold">
                  <BarChart3 className="size-4" />
                  No flashcards in this scope
                </div>
                <p className="text-sm text-muted-foreground">
                  Create flashcards or broaden the current filters to see
                  statistics here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <TrendSection points={trend} />
          )}
        </div>
      </div>
    </div>
  );
}
