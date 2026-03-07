import type {
  FlashcardReviewEntity,
  FlashcardReviewSchedulerSettings,
} from "@/lib/api/contracts";
import { previewFlashcardReview, type ReviewGrade } from "@/lib/fsrs";

export interface FlashcardReviewPreviewLabel {
  grade: ReviewGrade;
  state: FlashcardReviewEntity["state"];
  durationText: string;
}

interface FormatReviewPreviewLabelInput {
  card: FlashcardReviewEntity;
  scheduler: FlashcardReviewSchedulerSettings;
  now?: Date;
}

export function formatReviewPreviewDuration(
  nextDueAt: Date,
  now: Date,
): string {
  const deltaMs = Math.max(0, nextDueAt.getTime() - now.getTime());

  if (deltaMs < 60 * 1000) {
    return "0m";
  }

  const minutes = Math.round(deltaMs / (60 * 1000));

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.round(deltaMs / (60 * 60 * 1000));

  if (hours < 24) {
    return `${hours}h`;
  }

  const days = Math.round(deltaMs / (24 * 60 * 60 * 1000));
  return `${days}d`;
}

export function getFlashcardReviewPreviewLabels({
  card,
  scheduler,
  now = new Date(),
}: FormatReviewPreviewLabelInput): Record<
  ReviewGrade,
  FlashcardReviewPreviewLabel
> {
  const preview = previewFlashcardReview({
    card,
    now,
    desiredRetention: scheduler.desiredRetention,
    weights: scheduler.weights,
  });

  return {
    again: {
      grade: "again",
      state: preview.again.nextState,
      durationText: formatReviewPreviewDuration(preview.again.nextDueAt, now),
    },
    hard: {
      grade: "hard",
      state: preview.hard.nextState,
      durationText: formatReviewPreviewDuration(preview.hard.nextDueAt, now),
    },
    good: {
      grade: "good",
      state: preview.good.nextState,
      durationText: formatReviewPreviewDuration(preview.good.nextDueAt, now),
    },
    easy: {
      grade: "easy",
      state: preview.easy.nextState,
      durationText: formatReviewPreviewDuration(preview.easy.nextDueAt, now),
    },
  };
}
