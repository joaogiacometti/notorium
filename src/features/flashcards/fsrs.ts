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
const defaultDifficultyValue = 5;
const defaultStabilityValue = 0;

function isValidDate(value: Date): boolean {
  return Number.isFinite(value.getTime());
}

function isFiniteNumber(value: number): boolean {
  return Number.isFinite(value);
}

function normalizeDate(
  value: Date | string | null | undefined,
  fallback: Date,
): Date {
  if (!value) {
    return fallback;
  }

  const normalized = value instanceof Date ? new Date(value) : new Date(value);

  return isValidDate(normalized) ? normalized : fallback;
}

function normalizeOptionalDate(
  value: Date | string | null | undefined,
): Date | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value instanceof Date ? new Date(value) : new Date(value);

  return isValidDate(normalized) ? normalized : undefined;
}

function formatFsrsNumber(value: number): string {
  return (isFiniteNumber(value) ? value : 0).toFixed(4);
}

function parseNullableNumeric(
  value: string | number | null | undefined,
): number {
  if (typeof value === "number") {
    return isFiniteNumber(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);

    return isFiniteNumber(parsed) ? parsed : 0;
  }

  return 0;
}

function normalizeNonNegativeInteger(
  value: number | null | undefined,
  fallback: number = 0,
): number {
  if (typeof value !== "number" || !isFiniteNumber(value)) {
    return fallback;
  }

  return Math.max(0, Math.floor(value));
}

function normalizeFsrsOutputNumber(value: number, fallback: number): number {
  return isFiniteNumber(value) ? value : fallback;
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
  const due = normalizeDate(card.dueAt, now);
  const lastReview = normalizeOptionalDate(card.lastReviewedAt);
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
  const dueAt = normalizeDate(nextCard.due, now);
  const lastReviewedAt = normalizeDate(nextCard.last_review ?? now, now);
  const stability = normalizeFsrsOutputNumber(
    nextCard.stability,
    defaultStabilityValue,
  );
  const difficulty = normalizeFsrsOutputNumber(
    nextCard.difficulty,
    defaultDifficultyValue,
  );
  const intervalDays = normalizeNonNegativeInteger(nextCard.scheduled_days);
  const learningStep = normalizeNonNegativeInteger(nextCard.learning_steps);
  const reviewCount = normalizeNonNegativeInteger(nextCard.reps);
  const lapseCount = normalizeNonNegativeInteger(nextCard.lapses);
  const daysElapsed = normalizeNonNegativeInteger(next.log.elapsed_days);

  return {
    state: mapStateFromFsrs(nextCard.state),
    dueAt,
    stability: formatFsrsNumber(stability),
    difficulty: formatFsrsNumber(difficulty),
    ease: defaultEaseValue,
    intervalDays,
    learningStep,
    lastReviewedAt,
    reviewCount,
    lapseCount,
    updatedAt: now,
    daysElapsed,
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
