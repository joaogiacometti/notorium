import type { FlashcardReviewLogEntity } from "@/lib/server/api-contracts";

export const minimumOptimizationReviewCount = 64;
const optimizationReviewBatchSize = 32;

type FsrsBindingReviewConstructor = new (
  rating: number,
  deltaT: number,
) => FsrsBindingReviewInstance;

interface FsrsBindingReviewInstance {
  readonly rating: number;
  readonly deltaT: number;
}

type FsrsBindingItemConstructor = new (
  reviews: FsrsBindingReviewInstance[],
) => FsrsBindingItemInstance;

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

async function getFsrsBindingModule(): Promise<FsrsBindingModule> {
  return (await import(
    "@open-spaced-repetition/binding"
  )) as unknown as FsrsBindingModule;
}

function mapRatingToBindingRating(
  rating: FlashcardReviewLogEntity["rating"],
): number {
  if (rating === "again") return 1;
  if (rating === "hard") return 2;
  if (rating === "good") return 3;
  return 4;
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

async function buildTrainingSet(logs: FlashcardReviewLogEntity[]) {
  const eligibleCardLogs = getEligibleCardLogs(logs);

  if (eligibleCardLogs.length === 0) {
    return [];
  }

  const { FSRSBindingItem, FSRSBindingReview } = await getFsrsBindingModule();
  const trainingSet: FsrsBindingItemInstance[] = [];

  for (const cardLogs of eligibleCardLogs) {
    const reviews = cardLogs.map(
      (log) =>
        new FSRSBindingReview(
          mapRatingToBindingRating(log.rating),
          log.daysElapsed,
        ),
    );

    if (reviews.length < 2) {
      continue;
    }

    for (let index = 1; index < reviews.length; index++) {
      const slice = reviews.slice(0, index + 1);
      // FSRS binding requires at least one review with delta_t > 0; slices
      // built from same-day re-reviews would abort the Rust process otherwise.
      if (slice.some((r) => r.deltaT > 0)) {
        trainingSet.push(new FSRSBindingItem(slice));
      }
    }
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

  const trainingSet = await buildTrainingSet(logs);

  if (trainingSet.length === 0) {
    return null;
  }

  const { computeParameters } = await getFsrsBindingModule();
  return await computeParameters(trainingSet, {
    enableShortTerm: true,
    numRelearningSteps: 1,
    timeout: 10_000,
  });
}
