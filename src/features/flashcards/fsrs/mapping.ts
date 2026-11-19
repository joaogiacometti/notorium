import { type Grade, Rating, State } from "ts-fsrs";
import {
  type FsrsCard,
  type FsrsScheduler,
  fsrsSchedulerDefinition,
} from "@/features/flashcards/fsrs/definition";
import {
  formatFsrsNumber,
  normalizeDate,
  normalizeNonNegativeInteger,
  normalizeNonNegativeNumber,
  normalizeOptionalDate,
} from "@/features/flashcards/fsrs/normalization";
import type {
  ReviewGrade,
  ScheduleFlashcardReviewInput,
} from "@/features/flashcards/fsrs/types";
import type { FlashcardEntity } from "@/lib/server/api-contracts";

type FlashcardState = FlashcardEntity["state"];

const fsrsStateByFlashcardState = {
  new: State.New,
  learning: State.Learning,
  review: State.Review,
  relearning: State.Relearning,
} as const satisfies Record<FlashcardState, State>;

const flashcardStateByFsrsState: Record<State, FlashcardState> = {
  [State.New]: "new",
  [State.Learning]: "learning",
  [State.Review]: "review",
  [State.Relearning]: "relearning",
};

// ts-fsrs groups learning and relearning under one queue status.
const scheduleStatusByState = {
  new: "new",
  learning: "learning",
  review: "review",
  relearning: "learning",
} as const satisfies Record<FlashcardState, string>;

const ratingByGrade = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
} as const satisfies Record<ReviewGrade, Grade>;

export function mapStateFromFsrs(state: State): FlashcardState {
  return flashcardStateByFsrsState[state];
}

export function mapGradeToRating(grade: ReviewGrade): Grade {
  return ratingByGrade[grade];
}

function requireMemoryValue(
  value: string | null,
  field: string,
  cardId: string,
): number {
  const parsed = value === null ? Number.NaN : Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Flashcard ${cardId} has no valid FSRS-7 ${field}`);
  }
  return parsed;
}

/**
 * Convert a stored flashcard into a scheduler card. New cards always start
 * from the scheduler's own initial state; learned cards must carry a complete
 * FSRS-7 memory state, which is never invented here.
 */
export function buildFsrsCard(
  scheduler: FsrsScheduler,
  card: ScheduleFlashcardReviewInput["card"],
  now: Date,
): FsrsCard {
  const dueAt = normalizeDate(card.dueAt, now);

  if (card.state === "new") {
    return scheduler.newCard({ now: dueAt, cardId: card.id });
  }

  return fsrsSchedulerDefinition.schema.card.parse({
    cardId: card.id,
    dueAt,
    lastReviewAt: normalizeOptionalDate(card.lastReviewedAt) ?? null,
    stability: requireMemoryValue(card.stability, "stability", card.id),
    stabilityFast: requireMemoryValue(
      card.stabilityFast,
      "stabilityFast",
      card.id,
    ),
    difficulty: requireMemoryValue(card.difficulty, "difficulty", card.id),
    state: fsrsStateByFlashcardState[card.state],
    scheduleStatus: scheduleStatusByState[card.state],
    scheduledDays: normalizeNonNegativeNumber(card.intervalDays),
    learningStep: normalizeNonNegativeInteger(card.learningStep),
    reps: normalizeNonNegativeInteger(card.reviewCount),
    lapses: normalizeNonNegativeInteger(card.lapseCount),
  });
}

export function toSchedulingState(card: FsrsCard) {
  return {
    state: mapStateFromFsrs(card.state),
    dueAt: card.dueAt,
    stability: formatFsrsNumber(card.stability),
    stabilityFast: formatFsrsNumber(card.stabilityFast),
    difficulty: formatFsrsNumber(card.difficulty),
    intervalDays: card.scheduledDays,
    learningStep: card.learningStep,
    lastReviewedAt: card.lastReviewAt,
    reviewCount: card.reps,
    lapseCount: card.lapses,
  };
}
