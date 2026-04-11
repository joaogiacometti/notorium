import { count, eq } from "drizzle-orm";
import { getDb } from "@/db/index";
import {
  assessment,
  attendanceMiss,
  deck,
  flashcard,
  flashcardSchedulerSettings,
  note,
  subject,
} from "@/db/schema";
import { getImportedFlashcardSchedulingState } from "@/features/data-transfer/flashcard-scheduling";
import {
  getImportPayloadBytes,
  preValidateImportStructure,
  validateSubjectImportLimits,
} from "@/features/data-transfer/import-prevalidation";
import {
  type ImportData,
  importDataSchema,
} from "@/features/data-transfer/validation";
import { DEFAULT_DECK_NAME } from "@/features/decks/constants";
import {
  getDefaultFsrsDesiredRetention,
  getDefaultFsrsWeights,
  serializeFsrsWeights,
} from "@/features/flashcards/fsrs";
import { LIMITS } from "@/lib/config/limits";
import { normalizeRichTextForUniqueness } from "@/lib/editor/rich-text";
import { parseActionInput } from "@/lib/server/action-input";
import type { MutationResult } from "@/lib/server/api-contracts";
import { actionError } from "@/lib/server/server-action-errors";

export async function importDataForUser(
  userId: string,
  raw: unknown,
): Promise<MutationResult & { imported?: number }> {
  const importBytes = getImportPayloadBytes(raw);

  if (importBytes > LIMITS.importMaxBytes) {
    return actionError("dataTransfer.invalidImportFormat");
  }

  const preParsedRaw = preValidateImportStructure(raw);
  if (preParsedRaw) {
    return preParsedRaw;
  }

  const parsed = parseActionInput(
    importDataSchema,
    raw,
    "dataTransfer.invalidImportFormat",
  );
  if (!parsed.success) {
    return parsed.error;
  }

  const data = parsed.data;

  if (data.subjects.length === 0) {
    return actionError("dataTransfer.noSubjectsToImport");
  }

  const subjectCountResult = await getDb()
    .select({ total: count() })
    .from(subject)
    .where(eq(subject.userId, userId));

  const currentSubjects = subjectCountResult[0]?.total ?? 0;

  if (currentSubjects + data.subjects.length > LIMITS.maxSubjects) {
    return actionError("limits.subjectImportLimit", {
      errorParams: { max: LIMITS.maxSubjects },
    });
  }

  const subjectLimitsError = validateSubjectImportLimits(data.subjects);
  if (subjectLimitsError) {
    return subjectLimitsError;
  }

  try {
    const imported = await importSubjectsFromData(userId, data);
    return { success: true, imported };
  } catch {
    return actionError("dataTransfer.importFailed");
  }
}

async function importSubjectsFromData(userId: string, data: ImportData) {
  return getDb().transaction(async (tx) => {
    let importedCount = 0;
    const importedScheduler = data.flashcardScheduler ?? {
      desiredRetention: getDefaultFsrsDesiredRetention(),
      weights: getDefaultFsrsWeights(),
    };

    for (const importedSubject of data.subjects) {
      const [inserted] = await tx
        .insert(subject)
        .values({
          name: importedSubject.name,
          description: importedSubject.description,
          totalClasses: importedSubject.totalClasses,
          maxMisses: importedSubject.maxMisses,
          userId,
        })
        .returning({ id: subject.id });

      if (!inserted) {
        throw new Error("Failed to insert imported subject");
      }

      const subjectId = inserted.id;

      if (importedSubject.notes.length > 0) {
        await tx.insert(note).values(
          importedSubject.notes.map((currentNote) => ({
            title: currentNote.title,
            content: currentNote.content,
            subjectId,
            userId,
          })),
        );
      }

      if (importedSubject.attendanceMisses.length > 0) {
        await tx
          .insert(attendanceMiss)
          .values(
            importedSubject.attendanceMisses.map((miss) => ({
              missDate: miss.missDate,
              subjectId,
              userId,
            })),
          )
          .onConflictDoNothing();
      }

      if (importedSubject.assessments.length > 0) {
        await tx.insert(assessment).values(
          importedSubject.assessments.map((currentAssessment) => ({
            title: currentAssessment.title,
            description: currentAssessment.description,
            type: currentAssessment.type,
            status: currentAssessment.status,
            dueDate: currentAssessment.dueDate,
            score: currentAssessment.score,
            weight: currentAssessment.weight,
            subjectId,
            userId,
          })),
        );
      }

      const { deckNameToId, defaultDeckId } = await importDecksForSubject(
        tx,
        userId,
        subjectId,
        importedSubject.decks,
      );

      if (importedSubject.flashcards.length > 0) {
        await tx.insert(flashcard).values(
          importedSubject.flashcards.map((currentFlashcard) => ({
            ...getImportedFlashcardSchedulingState(currentFlashcard),
            front: currentFlashcard.front,
            frontNormalized: normalizeRichTextForUniqueness(
              currentFlashcard.front,
            ),
            back: currentFlashcard.back,
            deckId:
              currentFlashcard.deckName === undefined
                ? defaultDeckId
                : (deckNameToId.get(currentFlashcard.deckName) ??
                  defaultDeckId),
            subjectId,
            userId,
          })),
        );
      }

      importedCount++;
    }

    await tx
      .insert(flashcardSchedulerSettings)
      .values({
        userId,
        desiredRetention: importedScheduler.desiredRetention.toFixed(3),
        weights: serializeFsrsWeights(importedScheduler.weights),
        legacySchedulerMigratedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: flashcardSchedulerSettings.userId,
        set: {
          desiredRetention: importedScheduler.desiredRetention.toFixed(3),
          weights: serializeFsrsWeights(importedScheduler.weights),
        },
      });

    return importedCount;
  });
}

type Tx = Parameters<ReturnType<typeof getDb>["transaction"]>[0] extends (
  tx: infer T,
) => unknown
  ? T
  : never;

type ImportedDeck = ImportData["subjects"][number]["decks"][number];

async function importDecksForSubject(
  tx: Tx,
  userId: string,
  subjectId: string,
  importedDecks: ImportedDeck[],
): Promise<{
  deckNameToId: Map<string, string>;
  defaultDeckId: string;
}> {
  const deckNameToId = new Map<string, string>();
  let defaultDeckId: string | null = null;

  if (importedDecks.length > 0) {
    const insertedDecks = await tx
      .insert(deck)
      .values(
        importedDecks.map((d) => ({
          name: d.name,
          description: d.description ?? undefined,
          isDefault: d.isDefault,
          subjectId,
          userId,
        })),
      )
      .returning({ id: deck.id, name: deck.name, isDefault: deck.isDefault });

    for (const insertedDeck of insertedDecks) {
      deckNameToId.set(insertedDeck.name, insertedDeck.id);
      if (insertedDeck.isDefault) {
        defaultDeckId = insertedDeck.id;
      }
    }
  }

  if (defaultDeckId === null) {
    const [insertedDefault] = await tx
      .insert(deck)
      .values({
        name: DEFAULT_DECK_NAME,
        isDefault: true,
        subjectId,
        userId,
      })
      .returning({ id: deck.id });

    if (!insertedDefault) {
      throw new Error("Failed to insert default deck for imported subject");
    }

    defaultDeckId = insertedDefault.id;
    deckNameToId.set(DEFAULT_DECK_NAME, defaultDeckId);
  }

  return { deckNameToId, defaultDeckId };
}
