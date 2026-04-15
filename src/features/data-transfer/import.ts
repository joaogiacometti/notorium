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
import {
  getDefaultFsrsDesiredRetention,
  getDefaultFsrsWeights,
  serializeFsrsWeights,
} from "@/features/flashcards/fsrs";
import { LIMITS } from "@/lib/config/limits";
import {
  normalizeRichTextForUniqueness,
  removeInternalAttachmentImagesForTransfer,
} from "@/lib/editor/rich-text";
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

  const data: ImportData = {
    ...parsed.data,
    decks: parsed.data.decks ?? [],
    flashcards: parsed.data.flashcards ?? [],
    subjects: (parsed.data.subjects ?? []).map((currentSubject) => ({
      ...currentSubject,
      notes: currentSubject.notes ?? [],
      attendanceMisses: currentSubject.attendanceMisses ?? [],
      assessments: currentSubject.assessments ?? [],
    })),
  };

  if (
    data.subjects.length === 0 &&
    data.decks.length === 0 &&
    data.flashcards.length === 0
  ) {
    return actionError("dataTransfer.noSubjectsToImport");
  }

  if (data.subjects.length > 0) {
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
  }

  try {
    const imported = await importDataFromPayload(userId, data);
    return { success: true, imported };
  } catch {
    return actionError("dataTransfer.importFailed");
  }
}

type Tx = Parameters<ReturnType<typeof getDb>["transaction"]>[0] extends (
  tx: infer T,
) => unknown
  ? T
  : never;

async function importDataFromPayload(userId: string, data: ImportData) {
  return getDb().transaction(async (tx) => {
    let importedCount = 0;
    const importedScheduler = data.flashcardScheduler ?? {
      desiredRetention: getDefaultFsrsDesiredRetention(),
      weights: getDefaultFsrsWeights(),
    };

    const sharedDeckPathToId = await importDecksFromPaths(
      tx,
      userId,
      data.decks,
    );
    await insertFlashcardRows(tx, userId, data.flashcards, sharedDeckPathToId);

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
            content:
              currentNote.content === null
                ? null
                : removeInternalAttachmentImagesForTransfer(
                    currentNote.content,
                  ),
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

async function importDecksFromPaths(
  tx: Tx,
  userId: string,
  importedDecks: ImportData["decks"],
): Promise<Map<string, string>> {
  const pathToId = new Map<string, string>();

  const sorted = [...importedDecks].sort((a, b) => {
    const aDepth = a.path.split("::").length;
    const bDepth = b.path.split("::").length;
    return aDepth - bDepth;
  });

  for (const d of sorted) {
    const parts = d.path.split("::");
    const name = parts[parts.length - 1];
    const parentPath = parts.length > 1 ? parts.slice(0, -1).join("::") : null;
    const parentDeckId = parentPath ? (pathToId.get(parentPath) ?? null) : null;

    const insertBuilder = tx.insert(deck).values({
      name: name ?? d.path,
      description: d.description ?? undefined,
      parentDeckId,
      userId,
    });

    const insertResult =
      "onConflictDoNothing" in insertBuilder
        ? insertBuilder.onConflictDoNothing()
        : insertBuilder;
    const [returned] = await insertResult.returning({ id: deck.id });

    if (returned) {
      pathToId.set(d.path, returned.id);
    }
  }

  return pathToId;
}

async function insertFlashcardRows(
  tx: Tx,
  userId: string,
  importedFlashcards: ImportData["flashcards"],
  deckPathToId: Map<string, string>,
): Promise<number> {
  if (importedFlashcards.length === 0) {
    return 0;
  }

  const flashcardRows = importedFlashcards
    .map((fc) => {
      const deckId =
        (fc.deckPath ? deckPathToId.get(fc.deckPath) : undefined) ??
        (fc.deckName ? deckPathToId.get(fc.deckName) : undefined);

      if (!deckId) {
        return null;
      }

      const front = removeInternalAttachmentImagesForTransfer(fc.front);
      const back = removeInternalAttachmentImagesForTransfer(fc.back);

      return {
        ...getImportedFlashcardSchedulingState(fc),
        front,
        frontNormalized: normalizeRichTextForUniqueness(front),
        back,
        deckId,
        userId,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (flashcardRows.length === 0) {
    return 0;
  }

  await tx.insert(flashcard).values(flashcardRows);
  return flashcardRows.length;
}
