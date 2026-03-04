"use server";

import { and, asc, count, eq, isNull, lte, type SQL } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/index";
import { flashcard, subject } from "@/db/schema";
import type {
  FlashcardReviewEntity,
  MutationResult,
} from "@/lib/api/contracts";
import { getAuthenticatedUserId } from "@/lib/auth";
import { scheduleFlashcardReview } from "@/lib/flashcard-scheduler";
import { actionError } from "@/lib/server-action-errors";
import {
  type ReviewFlashcardForm,
  reviewFlashcardSchema,
} from "@/lib/validations/flashcard-review";

interface GetDueFlashcardsOptions {
  subjectId?: string;
  limit?: number;
}

interface ReviewSummary {
  dueCount: number;
  totalCount: number;
}

const defaultDueLimit = 50;

function getDueFilters(
  userId: string,
  now: Date,
  options: GetDueFlashcardsOptions,
): SQL<unknown>[] {
  const filters: SQL<unknown>[] = [
    eq(flashcard.userId, userId),
    eq(subject.userId, userId),
    lte(flashcard.dueAt, now),
    isNull(subject.archivedAt),
    eq(subject.flashcardsEnabled, true),
  ];

  if (options.subjectId) {
    filters.push(eq(flashcard.subjectId, options.subjectId));
  }

  return filters;
}

export async function getDueFlashcards(
  options: GetDueFlashcardsOptions = {},
): Promise<FlashcardReviewEntity[]> {
  const userId = await getAuthenticatedUserId();
  const now = new Date();
  const limit =
    options.limit && options.limit > 0
      ? Math.min(options.limit, 200)
      : defaultDueLimit;

  return db
    .select({ flashcard })
    .from(flashcard)
    .innerJoin(subject, eq(flashcard.subjectId, subject.id))
    .where(and(...getDueFilters(userId, now, options)))
    .orderBy(asc(flashcard.dueAt), asc(flashcard.createdAt))
    .limit(limit)
    .then((rows) => rows.map((row) => row.flashcard));
}

export async function getFlashcardReviewSummary(
  options: Pick<GetDueFlashcardsOptions, "subjectId"> = {},
): Promise<ReviewSummary> {
  const userId = await getAuthenticatedUserId();
  const now = new Date();

  const baseFilters: SQL<unknown>[] = [
    eq(flashcard.userId, userId),
    eq(subject.userId, userId),
    isNull(subject.archivedAt),
    eq(subject.flashcardsEnabled, true),
  ];

  if (options.subjectId) {
    baseFilters.push(eq(flashcard.subjectId, options.subjectId));
  }

  const [dueResult, totalResult] = await Promise.all([
    db
      .select({ total: count() })
      .from(flashcard)
      .innerJoin(subject, eq(flashcard.subjectId, subject.id))
      .where(and(...baseFilters, lte(flashcard.dueAt, now))),
    db
      .select({ total: count() })
      .from(flashcard)
      .innerJoin(subject, eq(flashcard.subjectId, subject.id))
      .where(and(...baseFilters)),
  ]);

  return {
    dueCount: dueResult[0]?.total ?? 0,
    totalCount: totalResult[0]?.total ?? 0,
  };
}

export async function reviewFlashcard(
  data: ReviewFlashcardForm,
): Promise<MutationResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = reviewFlashcardSchema.safeParse(data);

  if (!parsed.success) {
    return actionError("flashcards.review.invalidData");
  }

  const now = new Date();

  const existingCard = await db
    .select({ flashcard })
    .from(flashcard)
    .innerJoin(subject, eq(flashcard.subjectId, subject.id))
    .where(
      and(
        eq(flashcard.id, parsed.data.id),
        eq(flashcard.userId, userId),
        eq(subject.userId, userId),
        isNull(subject.archivedAt),
        eq(subject.flashcardsEnabled, true),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]?.flashcard ?? null);

  if (!existingCard) {
    return actionError("flashcards.review.notFound");
  }

  if (existingCard.dueAt.getTime() > now.getTime()) {
    return actionError("flashcards.review.notDue");
  }

  const nextState = scheduleFlashcardReview({
    card: {
      state: existingCard.state,
      ease: existingCard.ease,
      intervalDays: existingCard.intervalDays,
      learningStep: existingCard.learningStep,
      reviewCount: existingCard.reviewCount,
      lapseCount: existingCard.lapseCount,
    },
    grade: parsed.data.grade,
    now,
  });

  await db
    .update(flashcard)
    .set(nextState)
    .where(
      and(eq(flashcard.id, existingCard.id), eq(flashcard.userId, userId)),
    );

  revalidatePath("/flashcards/review");
  revalidatePath(`/subjects/${existingCard.subjectId}`);
  return { success: true };
}
