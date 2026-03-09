import { and, count, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db/index";
import {
  assessment,
  attendanceMiss,
  flashcard,
  flashcardSchedulerSettings,
  note,
  subject,
} from "@/db/schema";
import { appEnv } from "@/env";
import {
  type ImportData,
  importDataSchema,
} from "@/features/data-transfer/validation";
import {
  getDefaultFsrsDesiredRetention,
  getDefaultFsrsWeights,
  getInitialFlashcardSchedulingState,
  serializeFsrsWeights,
} from "@/features/flashcards/fsrs";
import { LIMITS } from "@/lib/config/limits";
import { parseActionInput } from "@/lib/server/action-input";
import type { MutationResult } from "@/lib/server/api-contracts";
import {
  type ActionErrorResult,
  actionError,
} from "@/lib/server/server-action-errors";

interface ExportOptions {
  templateOnly?: boolean;
}

export async function exportDataForUser(
  userId: string,
  options: ExportOptions = {},
): Promise<ImportData | ActionErrorResult> {
  const { templateOnly = false } = options;
  const [schedulerSettings] = await db
    .select()
    .from(flashcardSchedulerSettings)
    .where(eq(flashcardSchedulerSettings.userId, userId))
    .limit(1);

  const subjects = await db
    .select()
    .from(subject)
    .where(and(eq(subject.userId, userId), isNull(subject.archivedAt)));

  if (subjects.length === 0) {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      subjects: [],
    };
  }

  const subjectIds = subjects.map((item) => item.id);

  const [notes, misses, assessments, flashcards] = await Promise.all([
    templateOnly
      ? Promise.resolve([])
      : db
          .select()
          .from(note)
          .where(
            and(eq(note.userId, userId), inArray(note.subjectId, subjectIds)),
          ),
    templateOnly
      ? Promise.resolve([])
      : db
          .select()
          .from(attendanceMiss)
          .where(
            and(
              eq(attendanceMiss.userId, userId),
              inArray(attendanceMiss.subjectId, subjectIds),
            ),
          ),
    db
      .select()
      .from(assessment)
      .where(
        and(
          eq(assessment.userId, userId),
          inArray(assessment.subjectId, subjectIds),
        ),
      ),
    templateOnly
      ? Promise.resolve([])
      : db
          .select()
          .from(flashcard)
          .where(
            and(
              eq(flashcard.userId, userId),
              inArray(flashcard.subjectId, subjectIds),
            ),
          ),
  ]);

  const notesBySubjectId = groupRowsBySubjectId(notes);
  const missesBySubjectId = groupRowsBySubjectId(misses);
  const assessmentsBySubjectId = groupRowsBySubjectId(assessments);
  const flashcardsBySubjectId = groupRowsBySubjectId(flashcards);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    flashcardScheduler: schedulerSettings
      ? {
          desiredRetention: Number.parseFloat(
            String(schedulerSettings.desiredRetention),
          ),
          weights: JSON.parse(schedulerSettings.weights) as number[],
        }
      : {
          desiredRetention: getDefaultFsrsDesiredRetention(),
          weights: getDefaultFsrsWeights(),
        },
    subjects: subjects.map((item) => ({
      name: item.name,
      description: item.description,
      totalClasses: item.totalClasses,
      maxMisses: item.maxMisses,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      notes: (notesBySubjectId.get(item.id) ?? []).map((currentNote) => ({
        title: currentNote.title,
        content: currentNote.content,
        createdAt: currentNote.createdAt.toISOString(),
        updatedAt: currentNote.updatedAt.toISOString(),
      })),
      attendanceMisses: (missesBySubjectId.get(item.id) ?? []).map((miss) => ({
        missDate: miss.missDate,
      })),
      assessments: (assessmentsBySubjectId.get(item.id) ?? []).map(
        (currentAssessment) => ({
          title: currentAssessment.title,
          description: currentAssessment.description,
          type: currentAssessment.type,
          status: templateOnly
            ? ("pending" as const)
            : currentAssessment.status,
          dueDate: currentAssessment.dueDate,
          score: templateOnly ? null : currentAssessment.score,
          weight: currentAssessment.weight,
          createdAt: currentAssessment.createdAt.toISOString(),
          updatedAt: currentAssessment.updatedAt.toISOString(),
        }),
      ),
      flashcards: (flashcardsBySubjectId.get(item.id) ?? []).map(
        (currentFlashcard) => ({
          front: currentFlashcard.front,
          back: currentFlashcard.back,
          state: currentFlashcard.state,
          dueAt: currentFlashcard.dueAt.toISOString(),
          stability:
            currentFlashcard.stability === null
              ? null
              : Number.parseFloat(String(currentFlashcard.stability)),
          difficulty:
            currentFlashcard.difficulty === null
              ? null
              : Number.parseFloat(String(currentFlashcard.difficulty)),
          ease: currentFlashcard.ease,
          intervalDays: currentFlashcard.intervalDays,
          learningStep: currentFlashcard.learningStep,
          lastReviewedAt:
            currentFlashcard.lastReviewedAt?.toISOString() ?? null,
          reviewCount: currentFlashcard.reviewCount,
          lapseCount: currentFlashcard.lapseCount,
          createdAt: currentFlashcard.createdAt.toISOString(),
          updatedAt: currentFlashcard.updatedAt.toISOString(),
        }),
      ),
    })),
  };
}

export async function importDataForUser(
  userId: string,
  raw: unknown,
): Promise<MutationResult & { imported?: number }> {
  const rawPayload = JSON.stringify(raw);
  const importBytes = new TextEncoder().encode(rawPayload).length;

  if (importBytes > appEnv.MAX_IMPORT_BYTES) {
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

  const subjectCountResult = await db
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

function groupRowsBySubjectId<T extends { subjectId: string }>(rows: T[]) {
  const grouped = new Map<string, T[]>();

  for (const row of rows) {
    const existing = grouped.get(row.subjectId);
    if (existing) {
      existing.push(row);
      continue;
    }

    grouped.set(row.subjectId, [row]);
  }

  return grouped;
}

function preValidateImportStructure(raw: unknown): ActionErrorResult | null {
  const subjects = getRawImportSubjects(raw);
  if (!subjects) {
    return null;
  }

  if (subjects.length > LIMITS.maxSubjects) {
    return actionError("limits.subjectImportLimit", {
      errorParams: { max: LIMITS.maxSubjects },
    });
  }

  for (const entry of subjects) {
    const entryLimitError = validateRawSubjectLimit(entry);
    if (entryLimitError) {
      return entryLimitError;
    }
  }

  return null;
}

function getRawImportSubjects(raw: unknown): unknown[] | null {
  if (typeof raw !== "object" || raw === null || !("subjects" in raw)) {
    return null;
  }

  return Array.isArray(raw.subjects) ? raw.subjects : null;
}

function validateRawSubjectLimit(entry: unknown): ActionErrorResult | null {
  if (typeof entry !== "object" || entry === null) {
    return null;
  }

  const rawSubject = entry as Record<string, unknown>;

  return (
    validateRawCollectionLimit(
      rawSubject.notes,
      LIMITS.maxNotesPerSubject,
      "limits.noteLimit",
    ) ??
    validateRawCollectionLimit(
      rawSubject.assessments,
      LIMITS.maxAssessmentsPerSubject,
      "limits.assessmentLimit",
    ) ??
    validateRawCollectionLimit(
      rawSubject.flashcards,
      LIMITS.maxFlashcardsPerSubject,
      "limits.flashcardLimit",
    )
  );
}

function validateRawCollectionLimit(
  value: unknown,
  max: number,
  errorKey:
    | "limits.noteLimit"
    | "limits.assessmentLimit"
    | "limits.flashcardLimit",
): ActionErrorResult | null {
  if (!Array.isArray(value) || value.length <= max) {
    return null;
  }

  return actionError(errorKey, {
    errorParams: { max },
  });
}

function validateSubjectImportLimits(
  subjects: ImportData["subjects"],
): ActionErrorResult | null {
  for (const importedSubject of subjects) {
    if (importedSubject.notes.length > LIMITS.maxNotesPerSubject) {
      return actionError("limits.noteLimit", {
        errorParams: { max: LIMITS.maxNotesPerSubject },
      });
    }

    if (importedSubject.assessments.length > LIMITS.maxAssessmentsPerSubject) {
      return actionError("limits.assessmentLimit", {
        errorParams: { max: LIMITS.maxAssessmentsPerSubject },
      });
    }

    if (importedSubject.flashcards.length > LIMITS.maxFlashcardsPerSubject) {
      return actionError("limits.flashcardLimit", {
        errorParams: { max: LIMITS.maxFlashcardsPerSubject },
      });
    }
  }

  return null;
}

async function importSubjectsFromData(userId: string, data: ImportData) {
  return db.transaction(async (tx) => {
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

      if (importedSubject.flashcards.length > 0) {
        await tx.insert(flashcard).values(
          importedSubject.flashcards.map((currentFlashcard) => {
            const importedSchedulingState =
              typeof currentFlashcard.stability === "number" &&
              typeof currentFlashcard.difficulty === "number"
                ? {
                    state: currentFlashcard.state,
                    dueAt: new Date(currentFlashcard.dueAt),
                    stability: currentFlashcard.stability.toFixed(4),
                    difficulty: currentFlashcard.difficulty.toFixed(4),
                    ease: currentFlashcard.ease,
                    intervalDays: currentFlashcard.intervalDays,
                    learningStep: currentFlashcard.learningStep,
                    lastReviewedAt: currentFlashcard.lastReviewedAt
                      ? new Date(currentFlashcard.lastReviewedAt)
                      : null,
                    reviewCount: currentFlashcard.reviewCount,
                    lapseCount: currentFlashcard.lapseCount,
                    updatedAt: new Date(currentFlashcard.updatedAt),
                  }
                : getInitialFlashcardSchedulingState();

            return {
              ...importedSchedulingState,
              front: currentFlashcard.front,
              back: currentFlashcard.back,
              subjectId,
              userId,
            };
          }),
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
          legacySchedulerMigratedAt: new Date(),
          updatedAt: new Date(),
        },
      });

    return importedCount;
  });
}
