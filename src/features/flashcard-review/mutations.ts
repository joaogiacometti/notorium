import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/index";
import { flashcard, flashcardReviewLog } from "@/db/schema";
import { isCardDueWithLearnAhead } from "@/features/flashcard-review/constants";
import { getReviewableFlashcardForUser } from "@/features/flashcard-review/queries";
import type {
  ReviewFlashcardForm,
  SyncFlashcardReviewEventForm,
  SyncFlashcardReviewsForm,
} from "@/features/flashcard-review/validation";
import { scheduleFlashcardReview } from "@/features/flashcards/fsrs";
import {
  ensureFsrsSettings,
  maybeOptimizeFsrsParameters,
} from "@/features/flashcards/fsrs/settings";
import type {
  FlashcardReviewEntity,
  FlashcardReviewState,
  ReviewFlashcardResult,
  SyncFlashcardReviewsResult,
} from "@/lib/server/api-contracts";
import { actionError } from "@/lib/server/server-action-errors";

function getFlashcardReviewUpdateValues(
  nextState: ReturnType<typeof scheduleFlashcardReview>,
) {
  return {
    state: nextState.state,
    dueAt: nextState.dueAt,
    stability: nextState.stability,
    difficulty: nextState.difficulty,
    ease: nextState.ease,
    intervalDays: nextState.intervalDays,
    learningStep: nextState.learningStep,
    lastReviewedAt: nextState.lastReviewedAt,
    reviewCount: nextState.reviewCount,
    lapseCount: nextState.lapseCount,
    updatedAt: nextState.updatedAt,
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

  let updatedCard: FlashcardReviewEntity | undefined;

  try {
    updatedCard = await getDb().transaction(async (tx) => {
      const updatedCards = await tx
        .update(flashcard)
        .set(getFlashcardReviewUpdateValues(nextState))
        .where(
          and(eq(flashcard.id, existingCard.id), eq(flashcard.userId, userId)),
        )
        .returning({
          id: flashcard.id,
          front: flashcard.front,
          back: flashcard.back,
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
          deckId: flashcard.deckId,
        });

      await tx.insert(flashcardReviewLog).values({
        flashcardId: existingCard.id,
        userId,
        clientReviewId: data.clientReviewId,
        rating: data.grade,
        reviewedAt: effectiveNow,
        daysElapsed: nextState.daysElapsed,
      });

      return updatedCards[0];
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
    flashcard: updatedCard,
  };
}

export async function reviewFlashcardForUser(
  userId: string,
  data: ReviewFlashcardForm,
): Promise<ReviewFlashcardResult> {
  const result = await applyFlashcardReviewForUser(userId, data, new Date());

  void maybeOptimizeFsrsParameters(userId).catch(() => {});

  return result;
}

function sortReviewEventsByTime(
  events: SyncFlashcardReviewEventForm[],
): SyncFlashcardReviewEventForm[] {
  return [...events].sort(
    (left, right) => left.reviewedAt.getTime() - right.reviewedAt.getTime(),
  );
}

async function applySyncEvent(
  userId: string,
  event: SyncFlashcardReviewEventForm,
): Promise<"applied" | "rejected"> {
  if (await hasAppliedClientReviewId(userId, event.clientReviewId)) {
    return "applied";
  }

  const result = await applyFlashcardReviewForUser(
    userId,
    {
      id: event.flashcardId,
      grade: event.grade,
      clientReviewId: event.clientReviewId,
    },
    event.reviewedAt,
  );

  return result.success ? "applied" : "rejected";
}

/**
 * Applies queued offline flashcard reviews in chronological order.
 *
 * @example
 * await syncFlashcardReviewsForUser("user-1", { events: [] }, state)
 */
export async function syncFlashcardReviewsForUser(
  userId: string,
  data: SyncFlashcardReviewsForm,
  getReviewState: () => Promise<FlashcardReviewState>,
): Promise<SyncFlashcardReviewsResult> {
  const appliedClientReviewIds: string[] = [];
  const rejectedClientReviewIds: string[] = [];

  for (const event of sortReviewEventsByTime(data.events)) {
    const status = await applySyncEvent(userId, event);
    const target =
      status === "applied" ? appliedClientReviewIds : rejectedClientReviewIds;
    target.push(event.clientReviewId);
  }

  void maybeOptimizeFsrsParameters(userId).catch(() => {});

  return {
    success: true,
    appliedClientReviewIds,
    rejectedClientReviewIds,
    reviewState: await getReviewState(),
  };
}
