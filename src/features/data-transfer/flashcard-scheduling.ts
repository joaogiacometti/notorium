import type { ImportData } from "@/features/data-transfer/validation";
import { getInitialFlashcardSchedulingState } from "@/features/flashcards/fsrs";

function toSafeDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toSafeFiniteNumber(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value;
}

function toSafeNonNegativeInteger(
  value: number | null | undefined,
): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, Math.floor(value));
}

export function getImportedFlashcardSchedulingState(
  currentFlashcard: ImportData["subjects"][number]["flashcards"][number],
) {
  const dueAt = toSafeDate(currentFlashcard.dueAt);
  const updatedAt = toSafeDate(currentFlashcard.updatedAt);
  const stability = toSafeFiniteNumber(currentFlashcard.stability);
  const difficulty = toSafeFiniteNumber(currentFlashcard.difficulty);
  const intervalDays = toSafeNonNegativeInteger(currentFlashcard.intervalDays);
  const learningStep =
    currentFlashcard.learningStep === null
      ? null
      : toSafeNonNegativeInteger(currentFlashcard.learningStep);
  const reviewCount = toSafeNonNegativeInteger(currentFlashcard.reviewCount);
  const lapseCount = toSafeNonNegativeInteger(currentFlashcard.lapseCount);
  const lastReviewedAt =
    currentFlashcard.lastReviewedAt === null
      ? null
      : toSafeDate(currentFlashcard.lastReviewedAt);

  if (
    dueAt === null ||
    updatedAt === null ||
    stability === null ||
    difficulty === null ||
    intervalDays === null ||
    learningStep === undefined ||
    reviewCount === null ||
    lapseCount === null ||
    (currentFlashcard.lastReviewedAt !== null && lastReviewedAt === null)
  ) {
    return getInitialFlashcardSchedulingState();
  }

  return {
    state: currentFlashcard.state,
    dueAt,
    stability: stability.toFixed(4),
    difficulty: difficulty.toFixed(4),
    ease: currentFlashcard.ease,
    intervalDays,
    learningStep,
    lastReviewedAt,
    reviewCount,
    lapseCount,
    updatedAt,
  };
}
