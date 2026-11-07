"use client";

import { CheckCircle2, CircleAlert, Gauge, Sparkles } from "lucide-react";
import { gradeTones } from "@/components/flashcards/shared/grade-tones";
import { Button } from "@/components/ui/button";
import { gradeLabels, type ReviewGrade } from "@/features/flashcards/fsrs";
import { getStatusToneClasses } from "@/lib/ui/status-tones";
import { cn } from "@/lib/utils";

interface ReviewGradeButtonsProps {
  isPending: boolean;
  onGrade: (grade: ReviewGrade) => void;
}

const reviewGrades: ReviewGrade[] = ["again", "hard", "good", "easy"];
const gradeShortcuts: Record<ReviewGrade, string> = {
  again: "1",
  hard: "2",
  good: "3",
  easy: "4",
};
const gradeIcons: Record<ReviewGrade, typeof CircleAlert> = {
  again: CircleAlert,
  hard: Gauge,
  good: CheckCircle2,
  easy: Sparkles,
};
export function ReviewGradeButtons({
  isPending,
  onGrade,
}: Readonly<ReviewGradeButtonsProps>) {
  return (
    <>
      {reviewGrades.map((grade) => {
        const Icon = gradeIcons[grade];
        const tone = getStatusToneClasses(gradeTones[grade]);
        return (
          <Button
            key={grade}
            variant="outline"
            size="lg"
            onClick={() => onGrade(grade)}
            disabled={isPending}
            aria-keyshortcuts={gradeShortcuts[grade]}
            className={cn(
              "h-12 w-full min-w-0 border px-1.5 py-0 text-xs font-semibold leading-tight sm:h-auto sm:min-h-16 sm:px-4 sm:py-2 sm:text-sm",
              tone.border,
              tone.bg,
              tone.text,
              tone.hover,
            )}
          >
            <span className="flex min-w-0 flex-col items-center justify-center text-center sm:gap-1">
              <span className="flex min-w-0 items-center gap-1.5">
                <Icon className="hidden size-4 sm:inline-flex" />
                <span className="truncate">{gradeLabels[grade]}</span>
              </span>
            </span>
          </Button>
        );
      })}
    </>
  );
}
