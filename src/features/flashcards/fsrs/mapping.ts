import { type Card, createEmptyCard, type Grade, Rating, State } from "ts-fsrs";
import {
  normalizeDate,
  normalizeNonNegativeInteger,
  normalizeOptionalDate,
  parseNullableNumeric,
} from "@/features/flashcards/fsrs/normalization";
import type {
  ReviewGrade,
  ScheduleFlashcardReviewInput,
} from "@/features/flashcards/fsrs/types";
import type { FlashcardEntity } from "@/lib/server/api-contracts";

export function mapStateToFsrs(state: FlashcardEntity["state"]): State {
  switch (state) {
    case "learning":
      return State.Learning;
    case "review":
      return State.Review;
    case "relearning":
      return State.Relearning;
    default:
      return State.New;
  }
}

export function mapStateFromFsrs(state: State): FlashcardEntity["state"] {
  switch (state) {
    case State.Learning:
      return "learning";
    case State.Review:
      return "review";
    case State.Relearning:
      return "relearning";
    default:
      return "new";
  }
}

export function mapGradeToRating(grade: ReviewGrade): Grade {
  switch (grade) {
    case "again":
      return Rating.Again as Grade;
    case "hard":
      return Rating.Hard as Grade;
    case "easy":
      return Rating.Easy as Grade;
    default:
      return Rating.Good as Grade;
  }
}

export function buildFsrsCard(
  card: ScheduleFlashcardReviewInput["card"],
  now: Date,
): Card {
  if (card.state === "new") {
    const due = normalizeDate(card.dueAt, now);
    const freshCard = createEmptyCard(due);

    return {
      ...freshCard,
      due,
      state: State.New,
    };
  }

  const due = normalizeDate(card.dueAt, now);
  const lastReview = normalizeOptionalDate(card.lastReviewedAt);
  const daysElapsed = lastReview
    ? Math.max(
        0,
        Math.round(
          (now.getTime() - lastReview.getTime()) / (24 * 60 * 60 * 1000),
        ),
      )
    : 0;

  return {
    due,
    stability: parseNullableNumeric(card.stability),
    difficulty: parseNullableNumeric(card.difficulty),
    elapsed_days: daysElapsed,
    scheduled_days: normalizeNonNegativeInteger(card.intervalDays),
    learning_steps: normalizeNonNegativeInteger(card.learningStep),
    reps: normalizeNonNegativeInteger(card.reviewCount),
    lapses: normalizeNonNegativeInteger(card.lapseCount),
    state: mapStateToFsrs(card.state),
    last_review: lastReview,
  };
}
