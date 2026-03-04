import type { FlashcardEntity } from "@/lib/api/contracts";

export type ReviewGrade = "again" | "hard" | "good" | "easy";

interface SchedulerConfig {
  learningStepsMinutes: number[];
  relearningStepsMinutes: number[];
  graduatingIntervalDays: number;
  easyGraduatingIntervalDays: number;
  startingEase: number;
  minimumEase: number;
  hardFactor: number;
  easyBonus: number;
  intervalModifier: number;
  lapseMultiplier: number;
}

const defaultSchedulerConfig: SchedulerConfig = {
  learningStepsMinutes: [1, 10],
  relearningStepsMinutes: [10],
  graduatingIntervalDays: 1,
  easyGraduatingIntervalDays: 4,
  startingEase: 250,
  minimumEase: 130,
  hardFactor: 1.2,
  easyBonus: 1.3,
  intervalModifier: 1,
  lapseMultiplier: 0,
};

interface SchedulerInput {
  card: Pick<
    FlashcardEntity,
    | "state"
    | "ease"
    | "intervalDays"
    | "learningStep"
    | "reviewCount"
    | "lapseCount"
  >;
  grade: ReviewGrade;
  now?: Date;
  config?: SchedulerConfig;
}

export interface SchedulerOutput {
  state: FlashcardEntity["state"];
  dueAt: Date;
  ease: number;
  intervalDays: number;
  learningStep: number | null;
  lastReviewedAt: Date;
  reviewCount: number;
  lapseCount: number;
  updatedAt: Date;
}

function addMinutes(now: Date, minutes: number): Date {
  return new Date(now.getTime() + minutes * 60 * 1000);
}

function addDays(now: Date, days: number): Date {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}

function clampEase(ease: number, minimumEase: number): number {
  return Math.max(minimumEase, ease);
}

export function scheduleFlashcardReview({
  card,
  grade,
  now = new Date(),
  config = defaultSchedulerConfig,
}: SchedulerInput): SchedulerOutput {
  const previousEase = card.ease > 0 ? card.ease : config.startingEase;
  const previousInterval = Math.max(0, card.intervalDays);
  let state = card.state;
  let dueAt = now;
  let ease = previousEase;
  let intervalDays = previousInterval;
  let learningStep = card.learningStep;
  let lapseCount = card.lapseCount;

  if (card.state === "review") {
    if (grade === "again") {
      state = "relearning";
      ease = clampEase(previousEase - 20, config.minimumEase);
      intervalDays = Math.max(
        1,
        Math.floor(previousInterval * config.lapseMultiplier),
      );
      learningStep = 0;
      lapseCount += 1;
      dueAt = addMinutes(now, config.relearningStepsMinutes[0] ?? 10);
    }

    if (grade === "hard") {
      state = "review";
      ease = clampEase(previousEase - 15, config.minimumEase);
      intervalDays = Math.max(
        previousInterval + 1,
        Math.floor(
          previousInterval * config.hardFactor * config.intervalModifier,
        ),
      );
      learningStep = null;
      dueAt = addDays(now, intervalDays);
    }

    if (grade === "good") {
      state = "review";
      intervalDays = Math.max(
        previousInterval + 1,
        Math.floor(
          previousInterval * (previousEase / 100) * config.intervalModifier,
        ),
      );
      learningStep = null;
      dueAt = addDays(now, intervalDays);
    }

    if (grade === "easy") {
      state = "review";
      ease = previousEase + 15;
      intervalDays = Math.max(
        previousInterval + 1,
        Math.floor(
          previousInterval *
            (previousEase / 100) *
            config.easyBonus *
            config.intervalModifier,
        ),
      );
      learningStep = null;
      dueAt = addDays(now, intervalDays);
    }
  }

  if (card.state === "new" || card.state === "learning") {
    const step = card.state === "new" ? 0 : (card.learningStep ?? 0);

    if (grade === "again") {
      state = "learning";
      learningStep = 0;
      dueAt = addMinutes(now, config.learningStepsMinutes[0] ?? 1);
      intervalDays = 0;
    }

    if (grade === "hard") {
      state = "learning";
      learningStep = step;
      dueAt =
        step === 0
          ? addMinutes(now, 6)
          : addMinutes(now, config.learningStepsMinutes[step] ?? 10);
      intervalDays = 0;
    }

    if (grade === "good") {
      const nextStep = step + 1;

      if (nextStep >= config.learningStepsMinutes.length) {
        state = "review";
        learningStep = null;
        intervalDays = config.graduatingIntervalDays;
        dueAt = addDays(now, intervalDays);
      } else {
        state = "learning";
        learningStep = nextStep;
        dueAt = addMinutes(now, config.learningStepsMinutes[nextStep] ?? 10);
        intervalDays = 0;
      }
    }

    if (grade === "easy") {
      state = "review";
      learningStep = null;
      intervalDays = config.easyGraduatingIntervalDays;
      dueAt = addDays(now, intervalDays);
    }
  }

  if (card.state === "relearning") {
    const step = card.learningStep ?? 0;

    if (grade === "again") {
      state = "relearning";
      learningStep = 0;
      dueAt = addMinutes(now, config.relearningStepsMinutes[0] ?? 10);
    }

    if (grade === "hard") {
      state = "relearning";
      learningStep = step;
      dueAt = addMinutes(now, config.relearningStepsMinutes[step] ?? 10);
    }

    if (grade === "good") {
      const nextStep = step + 1;

      if (nextStep >= config.relearningStepsMinutes.length) {
        state = "review";
        learningStep = null;
        intervalDays = Math.max(1, previousInterval);
        dueAt = addDays(now, intervalDays);
      } else {
        state = "relearning";
        learningStep = nextStep;
        dueAt = addMinutes(now, config.relearningStepsMinutes[nextStep] ?? 10);
      }
    }

    if (grade === "easy") {
      state = "review";
      learningStep = null;
      intervalDays = config.easyGraduatingIntervalDays;
      dueAt = addDays(now, intervalDays);
    }
  }

  return {
    state,
    dueAt,
    ease,
    intervalDays,
    learningStep,
    lastReviewedAt: now,
    reviewCount: card.reviewCount + 1,
    lapseCount,
    updatedAt: now,
  };
}
