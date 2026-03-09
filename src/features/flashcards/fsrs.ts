import {
  type Card,
  createEmptyCard,
  fsrs,
  type Grade,
  generatorParameters,
  Rating,
  State,
} from "ts-fsrs";
import type { FlashcardEntity } from "@/lib/server/api-contracts";

export type ReviewGrade = "again" | "hard" | "good" | "easy";
export interface FlashcardReviewPreview {
  grade: ReviewGrade;
  nextState: FlashcardEntity["state"];
  nextDueAt: Date;
  intervalDays: number;
}

interface ScheduleFlashcardReviewInput {
  card: Pick<
    FlashcardEntity,
    | "state"
    | "dueAt"
    | "stability"
    | "difficulty"
    | "intervalDays"
    | "learningStep"
    | "lastReviewedAt"
    | "reviewCount"
    | "lapseCount"
  >;
  grade: ReviewGrade;
  now?: Date;
  desiredRetention?: number;
  weights?: number[];
  enableFuzz?: boolean;
}

interface PreviewFlashcardReviewInput
  extends Omit<ScheduleFlashcardReviewInput, "grade"> {}

export interface SchedulerOutput {
  state: FlashcardEntity["state"];
  dueAt: Date;
  stability: string;
  difficulty: string;
  ease: number;
  intervalDays: number;
  learningStep: number | null;
  lastReviewedAt: Date;
  reviewCount: number;
  lapseCount: number;
  updatedAt: Date;
  daysElapsed: number;
}

const defaultSchedulerParameters = generatorParameters({
  enable_fuzz: true,
  enable_short_term: true,
});

const defaultEaseValue = 250;

function formatFsrsNumber(value: number): string {
  return value.toFixed(4);
}

function parseNullableNumeric(
  value: string | number | null | undefined,
): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number.parseFloat(value);
  }

  return 0;
}

function mapStateToFsrs(state: FlashcardEntity["state"]): State {
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

function mapStateFromFsrs(state: State): FlashcardEntity["state"] {
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

function mapGradeToRating(grade: ReviewGrade): Grade {
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

function buildFsrsCard(
  card: ScheduleFlashcardReviewInput["card"],
  now: Date,
): Card {
  const lastReview = card.lastReviewedAt
    ? new Date(card.lastReviewedAt)
    : undefined;
  const daysElapsed =
    lastReview && card.state !== "new"
      ? Math.max(
          0,
          Math.round(
            (now.getTime() - lastReview.getTime()) / (24 * 60 * 60 * 1000),
          ),
        )
      : 0;

  return {
    due: new Date(card.dueAt),
    stability: parseNullableNumeric(card.stability),
    difficulty: parseNullableNumeric(card.difficulty),
    elapsed_days: daysElapsed,
    scheduled_days: Math.max(0, card.intervalDays),
    learning_steps: Math.max(0, card.learningStep ?? 0),
    reps: Math.max(0, card.reviewCount),
    lapses: Math.max(0, card.lapseCount),
    state: mapStateToFsrs(card.state),
    last_review: lastReview,
  };
}

export function getDefaultFsrsWeights(): number[] {
  return [...defaultSchedulerParameters.w];
}

export function getDefaultFsrsDesiredRetention(): number {
  return defaultSchedulerParameters.request_retention;
}

export function serializeFsrsWeights(weights: number[]): string {
  return JSON.stringify(weights);
}

export function parseFsrsWeights(value: string): number[] {
  const parsed = JSON.parse(value) as unknown;

  if (!Array.isArray(parsed)) {
    return getDefaultFsrsWeights();
  }

  const weights = parsed
    .map((entry) =>
      typeof entry === "number" ? entry : Number.parseFloat(String(entry)),
    )
    .filter((entry) => Number.isFinite(entry));

  return weights.length === defaultSchedulerParameters.w.length
    ? weights
    : getDefaultFsrsWeights();
}

export function getInitialFlashcardSchedulingState(now: Date = new Date()) {
  const card = createEmptyCard(now);

  return {
    state: mapStateFromFsrs(card.state),
    dueAt: card.due,
    stability: formatFsrsNumber(card.stability),
    difficulty: formatFsrsNumber(card.difficulty),
    ease: defaultEaseValue,
    intervalDays: card.scheduled_days,
    learningStep: card.learning_steps,
    lastReviewedAt: card.last_review ?? null,
    reviewCount: card.reps,
    lapseCount: card.lapses,
    updatedAt: now,
  };
}

export function scheduleFlashcardReview({
  card,
  grade,
  now = new Date(),
  desiredRetention = getDefaultFsrsDesiredRetention(),
  weights = getDefaultFsrsWeights(),
  enableFuzz = true,
}: ScheduleFlashcardReviewInput): SchedulerOutput {
  const scheduler = fsrs(
    generatorParameters({
      w: weights,
      request_retention: desiredRetention,
      enable_fuzz: enableFuzz,
      enable_short_term: true,
      learning_steps: defaultSchedulerParameters.learning_steps,
      relearning_steps: defaultSchedulerParameters.relearning_steps,
      maximum_interval: defaultSchedulerParameters.maximum_interval,
    }),
  );
  const currentCard = buildFsrsCard(card, now);
  const next = scheduler.next(currentCard, now, mapGradeToRating(grade));
  const nextCard = next.card;

  return {
    state: mapStateFromFsrs(nextCard.state),
    dueAt: nextCard.due,
    stability: formatFsrsNumber(nextCard.stability),
    difficulty: formatFsrsNumber(nextCard.difficulty),
    ease: defaultEaseValue,
    intervalDays: nextCard.scheduled_days,
    learningStep: nextCard.learning_steps,
    lastReviewedAt: nextCard.last_review ?? now,
    reviewCount: nextCard.reps,
    lapseCount: nextCard.lapses,
    updatedAt: now,
    daysElapsed: next.log.elapsed_days,
  };
}

export function previewFlashcardReview({
  card,
  now = new Date(),
  desiredRetention = getDefaultFsrsDesiredRetention(),
  weights = getDefaultFsrsWeights(),
  enableFuzz = true,
}: PreviewFlashcardReviewInput): Record<ReviewGrade, FlashcardReviewPreview> {
  return {
    again: buildPreviewForGrade("again"),
    hard: buildPreviewForGrade("hard"),
    good: buildPreviewForGrade("good"),
    easy: buildPreviewForGrade("easy"),
  };

  function buildPreviewForGrade(grade: ReviewGrade): FlashcardReviewPreview {
    const nextState = scheduleFlashcardReview({
      card,
      grade,
      now,
      desiredRetention,
      weights,
      enableFuzz,
    });

    return {
      grade,
      nextState: nextState.state,
      nextDueAt: nextState.dueAt,
      intervalDays: nextState.intervalDays,
    };
  }
}
