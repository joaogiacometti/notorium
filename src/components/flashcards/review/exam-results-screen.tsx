import { RotateCcw, X } from "lucide-react";
import { ExamBadge } from "@/components/flashcards/review/exam-badge";
import { gradeTones } from "@/components/flashcards/shared/grade-tones";
import { Button } from "@/components/ui/button";
import type { ReviewGrade } from "@/features/flashcards/fsrs";
import { gradeLabels } from "@/features/flashcards/fsrs";
import { getStatusToneClasses } from "@/lib/ui/status-tones";
import { cn } from "@/lib/utils";

const reviewGrades: ReviewGrade[] = ["again", "hard", "good", "easy"];

interface GradeArc {
  grade: ReviewGrade;
  length: number;
  offset: number;
}

/** Consecutive ring segments, one per grade that occurred, in grade order. */
function buildGradeArcs(
  counts: Record<ReviewGrade, number>,
  totalCards: number,
  circumference: number,
): GradeArc[] {
  const arcs: GradeArc[] = [];
  let offset = 0;
  for (const grade of reviewGrades) {
    const length =
      totalCards > 0 ? (counts[grade] / totalCards) * circumference : 0;
    if (length > 0) arcs.push({ grade, length, offset });
    offset += length;
  }
  return arcs;
}

interface ExamResultsScreenProps {
  totalCards: number;
  ratings: ReviewGrade[];
  duration: number;
  onClose: () => void;
  onRetryWeak?: () => void;
}

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

  const circumference = 2 * Math.PI * 40;
  const arcs = buildGradeArcs(counts, totalCards, circumference);

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center bg-background px-4 sm:px-6">
      <div className="w-full max-w-2xl space-y-8 text-center">
        <div className="absolute top-6 left-6">
          <ExamBadge />
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
          <h1 className="mb-2 text-xl font-semibold tracking-tight">
            Session complete
          </h1>
          <p className="text-muted-foreground">
            {totalCards === 1
              ? "1 card reviewed"
              : `All ${totalCards} cards reviewed`}{" "}
            · {formatDuration(duration)}
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
                strokeWidth="8"
                className="stroke-muted/30"
              />
              {arcs.map((arc) => (
                <circle
                  key={arc.grade}
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  strokeWidth="8"
                  strokeDasharray={`${arc.length} ${circumference - arc.length}`}
                  strokeDashoffset={-arc.offset}
                  className={getStatusToneClasses(gradeTones[arc.grade]).stroke}
                />
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold">{confidentPercent}%</span>
              <span className="text-sm text-muted-foreground">confident</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 sm:gap-4">
          {reviewGrades.map((grade) => {
            return (
              <div key={grade} className="rounded-lg border bg-card p-4 sm:p-6">
                <div
                  className={cn(
                    "mb-1 text-3xl font-bold tabular-nums",
                    getStatusToneClasses(gradeTones[grade]).text,
                  )}
                >
                  {counts[grade]}
                </div>
                <div className="text-xs font-medium text-muted-foreground capitalize">
                  {gradeLabels[grade]}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3 sm:gap-4">
          <Button variant="outline" onClick={onClose} className="flex-1 gap-2">
            <X className="size-4" />
            Close
          </Button>
          {onRetryWeak && (counts.again > 0 || counts.hard > 0) ? (
            <Button onClick={onRetryWeak} className="flex-1 gap-2">
              <RotateCcw className="size-4" />
              Retry weak cards
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
