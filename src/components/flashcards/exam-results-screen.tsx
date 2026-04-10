import { GraduationCap, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReviewGrade } from "@/features/flashcards/fsrs";

interface ExamResultsScreenProps {
  totalCards: number;
  ratings: ReviewGrade[];
  duration: number;
  onClose: () => void;
  onRetryWeak?: () => void;
}

const gradeColors: Record<ReviewGrade, string> = {
  again: "bg-[var(--status-danger-fill)]",
  hard: "bg-[var(--status-warning-fill)]",
  good: "bg-[var(--chart-3)]",
  easy: "bg-[var(--status-success-fill)]",
};

const gradeLabels: Record<ReviewGrade, string> = {
  again: "Again",
  hard: "Hard",
  good: "Good",
  easy: "Easy",
};

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
}

export function ExamResultsScreen({
  totalCards,
  ratings,
  duration,
  onClose,
  onRetryWeak,
}: Readonly<ExamResultsScreenProps>) {
  const counts = {
    again: ratings.filter((r) => r === "again").length,
    hard: ratings.filter((r) => r === "hard").length,
    good: ratings.filter((r) => r === "good").length,
    easy: ratings.filter((r) => r === "easy").length,
  };

  const confidentCount = counts.good + counts.easy;
  const confidentPercent =
    totalCards > 0 ? Math.round((confidentCount / totalCards) * 100) : 0;

  const againPercent = totalCards > 0 ? (counts.again / totalCards) * 100 : 0;
  const hardPercent = totalCards > 0 ? (counts.hard / totalCards) * 100 : 0;
  const goodPercent = totalCards > 0 ? (counts.good / totalCards) * 100 : 0;
  const easyPercent = totalCards > 0 ? (counts.easy / totalCards) * 100 : 0;

  const circumference = 2 * Math.PI * 40;
  const againArc = (againPercent / 100) * circumference;
  const hardArc = (hardPercent / 100) * circumference;
  const goodArc = (goodPercent / 100) * circumference;
  const easyArc = (easyPercent / 100) * circumference;

  return (
    <div className="fixed inset-0 z-110 flex flex-col items-center justify-center overflow-hidden bg-background px-4">
      <div className="w-full max-w-2xl space-y-8 text-center">
        <div className="absolute top-6 left-6">
          <div className="flex items-center gap-1.5 rounded-md border-2 border-[var(--assessment-exam-border)] bg-[var(--assessment-exam-bg)] px-2 py-1 text-xs font-bold tracking-wider text-[var(--assessment-exam-text)] uppercase">
            <GraduationCap className="size-3.5" />
            <span>EXAM</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-6 right-6 size-10"
          aria-label="Close"
          onClick={onClose}
        >
          <X className="size-5" />
        </Button>

        <div className="pt-8">
          <h1 className="mb-2 text-3xl font-bold">Session complete</h1>
          <p className="text-muted-foreground">
            All {totalCards} cards reviewed · {formatDuration(duration)}
          </p>
        </div>

        <div className="flex justify-center">
          <div className="relative size-48">
            <svg
              className="size-full -rotate-90"
              viewBox="0 0 100 100"
              role="img"
              aria-label={`${confidentPercent}% confident`}
            >
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-muted/30"
              />
              {againArc > 0 && (
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeDasharray={`${againArc} ${circumference - againArc}`}
                  strokeDashoffset="0"
                  className="text-[var(--status-danger-fill)] transition-all duration-1000"
                />
              )}
              {hardArc > 0 && (
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeDasharray={`${hardArc} ${circumference - hardArc}`}
                  strokeDashoffset={`-${againArc}`}
                  className="text-[var(--status-warning-fill)] transition-all duration-1000"
                />
              )}
              {goodArc > 0 && (
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeDasharray={`${goodArc} ${circumference - goodArc}`}
                  strokeDashoffset={`-${againArc + hardArc}`}
                  className="text-[var(--chart-3)] transition-all duration-1000"
                />
              )}
              {easyArc > 0 && (
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeDasharray={`${easyArc} ${circumference - easyArc}`}
                  strokeDashoffset={`-${againArc + hardArc + goodArc}`}
                  className="text-[var(--status-success-fill)] transition-all duration-1000"
                />
              )}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold">{confidentPercent}%</span>
              <span className="text-sm text-muted-foreground">confident</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {(["again", "hard", "good", "easy"] as const).map((grade) => {
            const colorMap = {
              again: "text-[var(--status-danger-text)]",
              hard: "text-[var(--status-warning-text)]",
              good: "text-[var(--chart-3)]",
              easy: "text-[var(--status-success-text)]",
            };
            return (
              <div
                key={grade}
                className="rounded-lg border border-border/60 bg-card p-4"
              >
                <div className={`mb-1 text-3xl font-bold ${colorMap[grade]}`}>
                  {counts[grade]}
                </div>
                <div className="text-xs font-medium text-muted-foreground capitalize">
                  {gradeLabels[grade]}
                </div>
              </div>
            );
          })}
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="flex h-full">
            {(["again", "hard", "good", "easy"] as const).map((grade) => {
              const width =
                totalCards > 0 ? (counts[grade] / totalCards) * 100 : 0;
              return width > 0 ? (
                <div
                  key={grade}
                  className={gradeColors[grade]}
                  style={{ width: `${width}%` }}
                />
              ) : null;
            })}
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1 gap-2">
            <X className="size-4" />
            Close
          </Button>
          {onRetryWeak && (counts.again > 0 || counts.hard > 0) ? (
            <Button
              onClick={onRetryWeak}
              className="flex-1 gap-2 bg-[var(--assessment-exam-text)] hover:bg-[var(--assessment-exam-text)]/90"
            >
              <RotateCcw className="size-4" />
              Retry weak cards
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
