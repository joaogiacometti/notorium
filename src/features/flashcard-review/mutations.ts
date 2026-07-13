import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/index";
import { flashcard, flashcardReviewLog } from "@/db/schema";
import { isCardDueWithLearnAhead } from "@/features/flashcard-review/constants";
import { getReviewableFlashcardForUser } from "@/features/flashcard-review/queries";
import type { FlashcardReviewSchedulingSnapshot } from "@/features/flashcard-review/types";
import type {
  ReviewFlashcardForm,
  UndoFlashcardReviewForm,
} from "@/features/flashcard-review/validation";
import { scheduleFlashcardReview } from "@/features/flashcards/fsrs";
import { ensureFsrsSettings } from "@/features/flashcards/fsrs/settings";
import type {
  FlashcardReviewEntity,
  ReviewFlashcardResult,
  UndoFlashcardReviewResult,
} from "@/lib/server/api-contracts";
import { actionError } from "@/lib/server/server-action-errors";

function getFlashcardReviewUpdateValues(
  nextState: ReturnType<typeof scheduleFlashcardReview>,
  reviewedAt: Date,
) {
  return {
    state: nextState.state,
    dueAt: nextState.dueAt,
    stability: nextState.stability,
    difficulty: nextState.difficulty,
    ease: nextState.ease,
    intervalDays: nextState.intervalDays,
    learningStep: nextState.learningStep,
    lastReviewedAt: reviewedAt,
    reviewCount: nextState.reviewCount,
    lapseCount: nextState.lapseCount,
    updatedAt: reviewedAt,
  };
}

const flashcardReviewSelection = {
  id: flashcard.id,
  front: flashcard.front,
  back: flashcard.back,
  type: flashcard.type,
  clozeSource: flashcard.clozeSource,
  occlusionImagePathname: flashcard.occlusionImagePathname,
  occlusionRegions: flashcard.occlusionRegions,
  occlusionMaskId: flashcard.occlusionMaskId,
  state: flashcard.state,
  dueAt: flashcard.dueAt,
  stability: flashcard.stability,
  difficulty: flashcard.difficulty,
  ease: flashcard.ease,
  intervalDays: flashcard.intervalDays,
  learningStep: flashcard.learningStep,
  lastReviewedAt: flashcard.lastReviewedAt,
  reviewCount: flashcard.reviewCount,
  lapseCount: flashcard.lapseCount,
  subjectId: flashcard.subjectId,
};

function getPreviousSchedulingState(
  card: Pick<
    FlashcardReviewEntity,
    | "state"
    | "dueAt"
    | "stability"
    | "difficulty"
    | "ease"
    | "intervalDays"
    | "learningStep"
    | "lastReviewedAt"
    | "reviewCount"
    | "lapseCount"
  >,
): FlashcardReviewSchedulingSnapshot {
  return {
    state: card.state,
    dueAt: card.dueAt.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    ease: card.ease,
    intervalDays: card.intervalDays,
    learningStep: card.learningStep,
    lastReviewedAt: card.lastReviewedAt?.toISOString() ?? null,
    reviewCount: card.reviewCount,
    lapseCount: card.lapseCount,
  };
}

function restoreSchedulingState(
  snapshot: FlashcardReviewSchedulingSnapshot,
  restoredAt: Date,
) {
  return {
    state: snapshot.state,
    dueAt: new Date(snapshot.dueAt),
    stability: snapshot.stability,
    difficulty: snapshot.difficulty,
    ease: snapshot.ease,
    intervalDays: snapshot.intervalDays,
    learningStep: snapshot.learningStep,
    lastReviewedAt: snapshot.lastReviewedAt
      ? new Date(snapshot.lastReviewedAt)
      : null,
    reviewCount: snapshot.reviewCount,
    lapseCount: snapshot.lapseCount,
    updatedAt: restoredAt,
  };
}

async function hasAppliedClientReviewId(
  userId: string,
  clientReviewId: string,
): Promise<boolean> {
  const rows = await getDb()
    .select({ id: flashcardReviewLog.id })
    .from(flashcardReviewLog)
    .where(
      and(
        eq(flashcardReviewLog.userId, userId),
        eq(flashcardReviewLog.clientReviewId, clientReviewId),
      ),
    )
    .limit(1);

  return rows.length > 0;
}

async function applyFlashcardReviewForUser(
  userId: string,
  data: ReviewFlashcardForm,
  reviewedAt: Date,
): Promise<ReviewFlashcardResult> {
  if (
    data.clientReviewId &&
    (await hasAppliedClientReviewId(userId, data.clientReviewId))
  ) {
    return actionError("flashcards.review.notFound");
  }

  const settings = await ensureFsrsSettings(userId);
  const existingCard = await getReviewableFlashcardForUser(userId, data.id);

  if (!existingCard) {
    return actionError("flashcards.review.notFound");
  }

  if (!isCardDueWithLearnAhead(existingCard, reviewedAt)) {
    return actionError("flashcards.review.notDue");
  }

  const effectiveNow = new Date(
    Math.max(reviewedAt.getTime(), existingCard.dueAt.getTime()),
  );

  const nextState = scheduleFlashcardReview({
    card: {
      state: existingCard.state,
      dueAt: existingCard.dueAt,
      stability: existingCard.stability,
      difficulty: existingCard.difficulty,
      intervalDays: existingCard.intervalDays,
      learningStep: existingCard.learningStep,
      lastReviewedAt: existingCard.lastReviewedAt,
      reviewCount: existingCard.reviewCount,
      lapseCount: existingCard.lapseCount,
    },
    grade: data.grade,
    now: effectiveNow,
    desiredRetention: settings.desiredRetention,
    weights: settings.weights,
  });

  const reviewLogId = crypto.randomUUID();
  let updatedCard: FlashcardReviewEntity | undefined;

  try {
    updatedCard = await getDb().transaction(async (tx) => {
      const updatedCards = await tx
        .update(flashcard)
        .set(getFlashcardReviewUpdateValues(nextState, reviewedAt))
        .where(
          and(
            eq(flashcard.id, existingCard.id),
            eq(flashcard.userId, userId),
            eq(flashcard.reviewCount, existingCard.reviewCount),
          ),
        )
        .returning(flashcardReviewSelection);

      const updatedCard = updatedCards[0];
      if (!updatedCard) {
        throw new Error(
          `Flashcard review conflict for ${existingCard.id}; expected reviewCount ${existingCard.reviewCount}`,
        );
      }

      await tx.insert(flashcardReviewLog).values({
        id: reviewLogId,
        flashcardId: existingCard.id,
        subjectId: existingCard.subjectId,
        userId,
        clientReviewId: data.clientReviewId,
        reviewCountAfter: nextState.reviewCount,
        previousSchedulingState: getPreviousSchedulingState(existingCard),
        rating: data.grade,
        reviewedAt,
        daysElapsed: nextState.daysElapsed,
      });

      return updatedCard;
    });
  } catch {
    return actionError("flashcards.review.unavailable");
  }

  if (!updatedCard) {
    return actionError("flashcards.review.notFound");
  }

  return {
    success: true,
    reviewedCardId: existingCard.id,
    reviewLogId,
    flashcard: {
      ...updatedCard,
      subjectName: existingCard.subjectName,
      subjectPath: existingCard.subjectPath,
    },
  };
}

async function getLatestReviewForUndo(
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
  userId: string,
  data: UndoFlashcardReviewForm,
) {
  const rows = await tx
    .select({
      id: flashcardReviewLog.id,
      reviewedAt: flashcardReviewLog.reviewedAt,
      reviewCountAfter: flashcardReviewLog.reviewCountAfter,
      previousSchedulingState: flashcardReviewLog.previousSchedulingState,
    })
    .from(flashcardReviewLog)
    .where(
      and(
        eq(flashcardReviewLog.userId, userId),
        eq(flashcardReviewLog.flashcardId, data.id),
      ),
    )
    .orderBy(
      desc(flashcardReviewLog.reviewedAt),
      desc(flashcardReviewLog.createdAt),
    )
    .limit(1);

  const latestReview = rows[0];
  if (!latestReview || latestReview.id !== data.reviewLogId) {
    return null;
  }

  return latestReview;
}

export async function undoFlashcardReviewForUser(
  userId: string,
  data: UndoFlashcardReviewForm,
): Promise<UndoFlashcardReviewResult> {
  const currentCard = await getReviewableFlashcardForUser(userId, data.id);
  if (!currentCard) {
    return actionError("flashcards.review.undoUnavailable");
  }

  const restoredAt = new Date();

  try {
    const restoredCard = await getDb().transaction(async (tx) => {
      const latestReview = await getLatestReviewForUndo(tx, userId, data);
      if (
        !latestReview?.previousSchedulingState ||
        latestReview.reviewCountAfter === null
      ) {
        return null;
      }

      const updatedCards = await tx
        .update(flashcard)
        .set(
          restoreSchedulingState(
            latestReview.previousSchedulingState,
            restoredAt,
          ),
        )
        .where(
          and(
            eq(flashcard.id, data.id),
            eq(flashcard.userId, userId),
            eq(flashcard.reviewCount, latestReview.reviewCountAfter),
            eq(flashcard.lastReviewedAt, latestReview.reviewedAt),
          ),
        )
        .returning(flashcardReviewSelection);

      const updatedCard = updatedCards[0];
      if (!updatedCard) {
        return null;
      }

      await tx
        .delete(flashcardReviewLog)
        .where(
          and(
            eq(flashcardReviewLog.id, latestReview.id),
            eq(flashcardReviewLog.userId, userId),
          ),
        );

      return updatedCard;
    });

    if (!restoredCard) {
      return actionError("flashcards.review.undoUnavailable");
    }

    return {
      success: true,
      flashcard: {
        ...restoredCard,
        subjectName: currentCard.subjectName,
        subjectPath: currentCard.subjectPath,
      },
    };
  } catch {
    return actionError("flashcards.review.undoUnavailable");
  }
}

export async function reviewFlashcardForUser(
  userId: string,
  data: ReviewFlashcardForm,
): Promise<ReviewFlashcardResult> {
  return applyFlashcardReviewForUser(userId, data, new Date());
}
