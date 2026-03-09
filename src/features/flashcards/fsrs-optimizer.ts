import { createRequire } from "node:module";
import type { FlashcardReviewLogEntity } from "@/lib/server/api-contracts";

const minimumOptimizationReviewCount = 64;
const optimizationReviewBatchSize = 32;
const require = createRequire(import.meta.url);

interface FsrsBindingReviewConstructor {
  new (rating: number, deltaT: number): FsrsBindingReviewInstance;
}

interface FsrsBindingReviewInstance {
  readonly rating: number;
  readonly deltaT: number;
}

interface FsrsBindingItemConstructor {
  new (reviews: FsrsBindingReviewInstance[]): FsrsBindingItemInstance;
}

interface FsrsBindingItemInstance {
  readonly reviews: FsrsBindingReviewInstance[];
}

interface FsrsBindingModule {
  FSRSBindingItem: FsrsBindingItemConstructor;
  FSRSBindingReview: FsrsBindingReviewConstructor;
  computeParameters: (
    trainSet: FsrsBindingItemInstance[],
    options: {
      enableShortTerm: boolean;
      numRelearningSteps?: number;
      timeout?: number;
    },
  ) => Promise<number[]>;
}

function getFsrsBindingModule(): FsrsBindingModule {
  return require("@open-spaced-repetition/binding") as FsrsBindingModule;
}

function mapRatingToBindingRating(rating: FlashcardReviewLogEntity["rating"]) {
  return rating === "again"
    ? 1
    : rating === "hard"
      ? 2
      : rating === "good"
        ? 3
        : 4;
}

function hasValidOptimizationHistory(
  logs: FlashcardReviewLogEntity[],
): boolean {
  return logs.some((log) => log.daysElapsed > 0);
}

function getEligibleCardLogs(logs: FlashcardReviewLogEntity[]) {
  const logsByFlashcardId = new Map<string, FlashcardReviewLogEntity[]>();

  for (const log of logs) {
    const existingLogs = logsByFlashcardId.get(log.flashcardId);
    if (existingLogs) {
      existingLogs.push(log);
      continue;
    }

    logsByFlashcardId.set(log.flashcardId, [log]);
  }

  return [...logsByFlashcardId.values()]
    .map((cardLogs) =>
      [...cardLogs].sort(
        (left, right) => left.reviewedAt.getTime() - right.reviewedAt.getTime(),
      ),
    )
    .filter(hasValidOptimizationHistory);
}

function buildTrainingSet(logs: FlashcardReviewLogEntity[]) {
  const eligibleCardLogs = getEligibleCardLogs(logs);

  if (eligibleCardLogs.length === 0) {
    return [];
  }

  const { FSRSBindingItem, FSRSBindingReview } = getFsrsBindingModule();
  const trainingSet: FsrsBindingItemInstance[] = [];

  for (const cardLogs of eligibleCardLogs) {
    const reviews = cardLogs.map(
      (log) =>
        new FSRSBindingReview(
          mapRatingToBindingRating(log.rating),
          log.daysElapsed,
        ),
    );

    if (reviews.length === 0) {
      continue;
    }

    trainingSet.push(new FSRSBindingItem(reviews));
  }

  return trainingSet;
}

export function shouldOptimizeFsrsParameters(
  reviewCount: number,
  optimizedReviewCount: number,
): boolean {
  return (
    reviewCount >= minimumOptimizationReviewCount &&
    reviewCount - optimizedReviewCount >= optimizationReviewBatchSize
  );
}

export async function optimizeFsrsParameters(
  logs: FlashcardReviewLogEntity[],
): Promise<number[] | null> {
  if (logs.length < minimumOptimizationReviewCount) {
    return null;
  }

  const trainingSet = buildTrainingSet(logs);

  if (trainingSet.length === 0) {
    return null;
  }

  try {
    const { computeParameters } = getFsrsBindingModule();
    return await computeParameters(trainingSet, {
      enableShortTerm: true,
      numRelearningSteps: 1,
      timeout: 30_000,
    });
  } catch {
    return null;
  }
}
