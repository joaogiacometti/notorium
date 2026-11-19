import type { FlashcardReviewLogEntity } from "@/lib/server/api-contracts";

export const minimumOptimizationReviewCount = 64;

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
      modelVersion: "FSRS-7";
      enableShortTerm: boolean;
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

const millisecondsPerDay = 24 * 60 * 60 * 1000;

// FSRS-7 trains on fractional days between actual review times; the first
// review of a history has no elapsed time.
function getElapsedDays(cardLogs: FlashcardReviewLogEntity[]): number[] {
  return cardLogs.map((log, index) => {
    const previous = cardLogs[index - 1];
    return previous
      ? Math.max(
          0,
          (log.reviewedAt.getTime() - previous.reviewedAt.getTime()) /
            millisecondsPerDay,
        )
      : 0;
  });
}

function groupLogsByCard(logs: FlashcardReviewLogEntity[]) {
  const logsByFlashcardId = new Map<string, FlashcardReviewLogEntity[]>();

  for (const log of logs) {
    const existingLogs = logsByFlashcardId.get(log.flashcardId);
    if (existingLogs) {
      existingLogs.push(log);
      continue;
    }

    logsByFlashcardId.set(log.flashcardId, [log]);
  }

  return [...logsByFlashcardId.values()].map((cardLogs) =>
    [...cardLogs].sort(
      (left, right) => left.reviewedAt.getTime() - right.reviewedAt.getTime(),
    ),
  );
}

async function buildTrainingSet(logs: FlashcardReviewLogEntity[]) {
  const cardHistories = groupLogsByCard(logs);

  if (cardHistories.length === 0) {
    return [];
  }

  const { FSRSBindingItem, FSRSBindingReview } = await getFsrsBindingModule();
  const trainingSet: FsrsBindingItemInstance[] = [];

  for (const cardLogs of cardHistories) {
    const elapsedDays = getElapsedDays(cardLogs);
    const reviews = cardLogs.map(
      (log, index) =>
        new FSRSBindingReview(
          mapRatingToBindingRating(log.rating),
          elapsedDays[index] ?? 0,
        ),
    );

    if (reviews.length < 2) {
      continue;
    }

    for (let index = 1; index < reviews.length; index++) {
      const slice = reviews.slice(0, index + 1);
      // The binding rejects items without a review after elapsed time, such
      // as slices of reviews recorded at the same instant.
      if (slice.some((r) => r.deltaT > 0)) {
        trainingSet.push(new FSRSBindingItem(slice));
      }
    }
  }

  return trainingSet;
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
    modelVersion: "FSRS-7",
    enableShortTerm: true,
    timeout: 10_000,
  });
}
