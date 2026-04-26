"use client";

import {
  CheckCircle2,
  CircleAlert,
  Gauge,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { getFlashcardReviewPreviewLabels } from "@/features/flashcard-review/preview";
import { gradeLabels, type ReviewGrade } from "@/features/flashcards/fsrs";

interface ReviewGradeButtonsProps {
  pendingGrade: ReviewGrade | null;
  previewLabels: ReturnType<typeof getFlashcardReviewPreviewLabels> | null;
  isPending: boolean;
  onGrade: (grade: ReviewGrade) => void;
}

const reviewGrades: ReviewGrade[] = ["again", "hard", "good", "easy"];
const gradeButtonStyles: Record<ReviewGrade, string> = {
  again:
    "border-[color:var(--intent-danger-border)] bg-[color:var(--intent-danger-bg)] text-[color:var(--intent-danger-text)] hover:border-[color:var(--intent-danger-border-hover)] hover:bg-[color:var(--intent-danger-bg-hover)]",
  hard: "border-[color:var(--intent-warning-border)] bg-[color:var(--intent-warning-bg)] text-[color:var(--intent-warning-text)] hover:border-[color:var(--intent-warning-border-hover)] hover:bg-[color:var(--intent-warning-bg-hover)]",
  good: "border-[color:var(--intent-info-border)] bg-[color:var(--intent-info-bg)] text-[color:var(--intent-info-text)] hover:border-[color:var(--intent-info-border-hover)] hover:bg-[color:var(--intent-info-bg-hover)]",
  easy: "border-[color:var(--intent-success-border)] bg-[color:var(--intent-success-bg)] text-[color:var(--intent-success-text)] hover:border-[color:var(--intent-success-border-hover)] hover:bg-[color:var(--intent-success-bg-hover)]",
};
const gradeIcons: Record<ReviewGrade, typeof CircleAlert> = {
  again: CircleAlert,
  hard: Gauge,
  good: CheckCircle2,
  easy: Sparkles,
};
export function ReviewGradeButtons({
  pendingGrade,
  previewLabels,
  isPending,
  onGrade,
}: Readonly<ReviewGradeButtonsProps>) {
  return (
    <>
      {reviewGrades.map((grade) => {
        const Icon = gradeIcons[grade];
        const isActivePendingGrade = pendingGrade === grade;

        return (
          <Button
            key={grade}
            variant="outline"
            size="lg"
            onClick={() => onGrade(grade)}
            disabled={isPending}
            className={`h-auto min-h-14 w-full min-w-0 border-2 px-1 py-0.75 text-[11px] font-semibold leading-tight shadow-xs transition-transform hover:-translate-y-0.5 sm:min-h-16 sm:px-4 sm:py-2 sm:text-sm ${gradeButtonStyles[grade]}`}
          >
            <span className="flex min-w-0 flex-col items-center justify-center gap-px text-center">
              <span className="flex min-w-0 items-center gap-1 sm:gap-1.5">
                {isActivePendingGrade ? (
                  <Loader2 className="size-3.5 animate-spin sm:size-4" />
                ) : (
                  <Icon className="hidden size-4 sm:inline-flex" />
                )}
                <span className="truncate">{gradeLabels[grade]}</span>
              </span>
              {previewLabels ? (
                <span className="text-pretty whitespace-normal wrap-break-word text-[9px] leading-tight font-medium opacity-80 sm:text-[11px]">
                  {previewLabels[grade].durationText}
                </span>
              ) : null}
            </span>
          </Button>
        );
      })}
    </>
  );
}
