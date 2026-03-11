import { and, eq } from "drizzle-orm";
import { db } from "@/db/index";
import { flashcard } from "@/db/schema";
import { generateFlashcardBackForUser } from "@/features/flashcards/ai-service";
import {
  mapAnkiImportCardToFlashcardInsert,
  parseAnkiImportFile,
} from "@/features/flashcards/anki-import";
import {
  type ImportAnkiFlashcardsInput,
  importAnkiFlashcardsSchema,
} from "@/features/flashcards/anki-import-validation";
import { getInitialFlashcardSchedulingState } from "@/features/flashcards/fsrs";
import {
  countFlashcardsBySubjectForUser,
  getFlashcardRecordForUser,
} from "@/features/flashcards/queries";
import type {
  CreateFlashcardForm,
  DeleteFlashcardForm,
  EditFlashcardForm,
  GenerateFlashcardBackForm,
  ResetFlashcardForm,
} from "@/features/flashcards/validation";
import {
  getActiveSubjectByIdForUser,
  getActiveSubjectRecordForUser,
} from "@/features/subjects/queries";
import { LIMITS } from "@/lib/config/limits";
import type {
  CreateFlashcardResult,
  EditFlashcardResult,
  GenerateFlashcardBackResult,
  MutationResult,
  ResetFlashcardResult,
} from "@/lib/server/api-contracts";
import {
  type ActionErrorResult,
  actionError,
} from "@/lib/server/server-action-errors";

export type DeleteFlashcardMutationResult =
  | {
      success: true;
      id: string;
      subjectId: string;
    }
  | ActionErrorResult;

export async function createFlashcardForUser(
  userId: string,
  data: CreateFlashcardForm,
): Promise<CreateFlashcardResult> {
  const existingSubject = await getActiveSubjectRecordForUser(
    userId,
    data.subjectId,
  );

  if (!existingSubject) {
    return actionError("subjects.notFound");
  }

  const current = await countFlashcardsBySubjectForUser(userId, data.subjectId);

  if (current >= LIMITS.maxFlashcardsPerSubject) {
    return actionError("limits.flashcardLimit", {
      errorParams: { max: LIMITS.maxFlashcardsPerSubject },
    });
  }

  const schedulingState = getInitialFlashcardSchedulingState();
  const inserted = await db
    .insert(flashcard)
    .values({
      subjectId: data.subjectId,
      userId,
      front: data.front,
      back: data.back,
      state: schedulingState.state,
      dueAt: schedulingState.dueAt,
      stability: schedulingState.stability,
      difficulty: schedulingState.difficulty,
      ease: schedulingState.ease,
      intervalDays: schedulingState.intervalDays,
      learningStep: schedulingState.learningStep,
      lastReviewedAt: schedulingState.lastReviewedAt,
      reviewCount: schedulingState.reviewCount,
      lapseCount: schedulingState.lapseCount,
    })
    .returning();

  return { success: true, flashcard: inserted[0] };
}

export async function importAnkiFlashcardsForUser(
  userId: string,
  input: { subjectId: string; file: File },
): Promise<MutationResult & { imported?: number }> {
  const existingSubject = await getActiveSubjectRecordForUser(
    userId,
    input.subjectId,
  );

  if (!existingSubject) {
    return actionError("subjects.notFound");
  }

  const current = await countFlashcardsBySubjectForUser(
    userId,
    input.subjectId,
  );
  let parsedCards: ImportAnkiFlashcardsInput["cards"];

  try {
    parsedCards = await parseAnkiImportFile(input.file);
  } catch {
    return actionError("flashcards.import.invalidFormat");
  }

  const parsed = importAnkiFlashcardsSchema.safeParse({
    subjectId: input.subjectId,
    cards: parsedCards,
  });

  if (!parsed.success) {
    return actionError("flashcards.import.invalidFormat");
  }

  if (parsed.data.cards.length === 0) {
    return actionError("flashcards.import.noCards");
  }

  const incoming = parsed.data.cards.length;

  if (current + incoming > LIMITS.maxFlashcardsPerSubject) {
    return actionError("limits.flashcardLimit", {
      errorParams: { max: LIMITS.maxFlashcardsPerSubject },
    });
  }

  try {
    const now = new Date();

    await db.insert(flashcard).values(
      parsed.data.cards.map((cardData) => ({
        ...mapAnkiImportCardToFlashcardInsert(cardData, now),
        subjectId: input.subjectId,
        userId,
      })),
    );
  } catch {
    return actionError("flashcards.import.failed");
  }

  return { success: true, imported: incoming };
}

export async function editFlashcardForUser(
  userId: string,
  data: EditFlashcardForm,
): Promise<EditFlashcardResult> {
  const existingFlashcard = await getFlashcardRecordForUser(userId, data.id);

  if (!existingFlashcard) {
    return actionError("flashcards.notFound");
  }

  const updated = await db
    .update(flashcard)
    .set({
      front: data.front,
      back: data.back,
    })
    .where(and(eq(flashcard.id, data.id), eq(flashcard.userId, userId)))
    .returning();

  return { success: true, flashcard: updated[0] };
}

export async function generateFlashcardBackForUserInput(
  userId: string,
  data: GenerateFlashcardBackForm,
): Promise<GenerateFlashcardBackResult> {
  const existingSubject = await getActiveSubjectByIdForUser(
    userId,
    data.subjectId,
  );

  if (!existingSubject) {
    return actionError("subjects.notFound");
  }

  const result = await generateFlashcardBackForUser({
    userId,
    subjectName: existingSubject.name,
    front: data.front,
  });

  if (!result.success) {
    return actionError(result.errorCode);
  }

  return { success: true, back: result.back };
}

export async function deleteFlashcardForUser(
  userId: string,
  data: DeleteFlashcardForm,
): Promise<DeleteFlashcardMutationResult> {
  const existingFlashcard = await getFlashcardRecordForUser(userId, data.id);

  if (!existingFlashcard) {
    return actionError("flashcards.notFound");
  }

  await db
    .delete(flashcard)
    .where(and(eq(flashcard.id, data.id), eq(flashcard.userId, userId)));

  return { success: true, id: data.id, subjectId: existingFlashcard.subjectId };
}

export async function resetFlashcardForUser(
  userId: string,
  data: ResetFlashcardForm,
): Promise<ResetFlashcardResult> {
  const existingFlashcard = await getFlashcardRecordForUser(userId, data.id);

  if (!existingFlashcard) {
    return actionError("flashcards.notFound");
  }

  const now = new Date();
  const schedulingState = getInitialFlashcardSchedulingState(now);

  const updated = await db
    .update(flashcard)
    .set({
      state: schedulingState.state,
      dueAt: schedulingState.dueAt,
      stability: schedulingState.stability,
      difficulty: schedulingState.difficulty,
      ease: schedulingState.ease,
      intervalDays: schedulingState.intervalDays,
      learningStep: schedulingState.learningStep,
      lastReviewedAt: schedulingState.lastReviewedAt,
      reviewCount: schedulingState.reviewCount,
      lapseCount: schedulingState.lapseCount,
      updatedAt: now,
    })
    .where(and(eq(flashcard.id, data.id), eq(flashcard.userId, userId)))
    .returning();

  return { success: true, flashcard: updated[0] };
}
