"use server";

import { and, count, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
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
import type { MutationResult } from "@/lib/api/contracts";
import { getAuthenticatedUserId } from "@/lib/auth";
import {
  getDefaultFsrsDesiredRetention,
  getDefaultFsrsWeights,
  getInitialFlashcardSchedulingState,
  serializeFsrsWeights,
} from "@/lib/fsrs";
import { LIMITS } from "@/lib/limits";
import {
  type ActionErrorResult,
  actionError,
} from "@/lib/server-action-errors";
import {
  type ImportData,
  importDataSchema,
} from "@/lib/validations/data-transfer";

interface ExportOptions {
  templateOnly?: boolean;
}

export async function exportData(
  options: ExportOptions = {},
): Promise<ImportData | ActionErrorResult> {
  const { templateOnly = false } = options;
  const userId = await getAuthenticatedUserId();
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

  const subjectIds = subjects.map((s) => s.id);

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

  const subjectsWithData = subjects.map((s) => ({
    name: s.name,
    description: s.description,
    totalClasses: s.totalClasses,
    maxMisses: s.maxMisses,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    notes: (notesBySubjectId.get(s.id) ?? []).map((n) => ({
      title: n.title,
      content: n.content,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    })),
    attendanceMisses: (missesBySubjectId.get(s.id) ?? []).map((m) => ({
      missDate: m.missDate,
    })),
    assessments: (assessmentsBySubjectId.get(s.id) ?? []).map((a) => ({
      title: a.title,
      description: a.description,
      type: a.type,
      status: templateOnly ? ("pending" as const) : a.status,
      dueDate: a.dueDate,
      score: templateOnly ? null : a.score,
      weight: a.weight,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    })),
    flashcards: (flashcardsBySubjectId.get(s.id) ?? []).map((f) => ({
      front: f.front,
      back: f.back,
      state: f.state,
      dueAt: f.dueAt.toISOString(),
      stability:
        f.stability === null ? null : Number.parseFloat(String(f.stability)),
      difficulty:
        f.difficulty === null ? null : Number.parseFloat(String(f.difficulty)),
      ease: f.ease,
      intervalDays: f.intervalDays,
      learningStep: f.learningStep,
      lastReviewedAt: f.lastReviewedAt?.toISOString() ?? null,
      reviewCount: f.reviewCount,
      lapseCount: f.lapseCount,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    })),
  }));

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
    subjects: subjectsWithData,
  };
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

export async function importData(
  raw: unknown,
): Promise<MutationResult & { imported?: number }> {
  const userId = await getAuthenticatedUserId();
  const maxImportBytes = appEnv.MAX_IMPORT_BYTES;
  const rawPayload = JSON.stringify(raw);
  const importBytes = new TextEncoder().encode(rawPayload).length;

  if (importBytes > maxImportBytes) {
    return actionError("dataTransfer.invalidImportFormat");
  }

  const preParsedRaw = preValidateImportStructure(raw);
  if (preParsedRaw) {
    return preParsedRaw;
  }

  const parsed = importDataSchema.safeParse(raw);
  if (!parsed.success) {
    return actionError("dataTransfer.invalidImportFormat");
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

  let importedCount = 0;
  try {
    importedCount = await importSubjectsFromData(userId, data);
  } catch {
    return actionError("dataTransfer.importFailed");
  }

  revalidatePath("/subjects");
  revalidatePath("/assessments");
  revalidatePath("/flashcards/review");
  return { success: true, imported: importedCount };
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
    const importedScheduler =
      data.flashcardScheduler ??
      ({
        desiredRetention: getDefaultFsrsDesiredRetention(),
        weights: getDefaultFsrsWeights(),
      } as const);

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
          importedSubject.notes.map((n) => ({
            title: n.title,
            content: n.content,
            subjectId,
            userId,
          })),
        );
      }

      if (importedSubject.attendanceMisses.length > 0) {
        await tx
          .insert(attendanceMiss)
          .values(
            importedSubject.attendanceMisses.map((m) => ({
              missDate: m.missDate,
              subjectId,
              userId,
            })),
          )
          .onConflictDoNothing();
      }

      if (importedSubject.assessments.length > 0) {
        await tx.insert(assessment).values(
          importedSubject.assessments.map((a) => ({
            title: a.title,
            description: a.description,
            type: a.type,
            status: a.status,
            dueDate: a.dueDate,
            score: a.score,
            weight: a.weight,
            subjectId,
            userId,
          })),
        );
      }

      if (importedSubject.flashcards.length > 0) {
        await tx.insert(flashcard).values(
          importedSubject.flashcards.map((f) => {
            const importedSchedulingState =
              typeof f.stability === "number" &&
              typeof f.difficulty === "number"
                ? {
                    state: f.state,
                    dueAt: new Date(f.dueAt),
                    stability: f.stability.toFixed(4),
                    difficulty: f.difficulty.toFixed(4),
                    ease: f.ease,
                    intervalDays: f.intervalDays,
                    learningStep: f.learningStep,
                    lastReviewedAt: f.lastReviewedAt
                      ? new Date(f.lastReviewedAt)
                      : null,
                    reviewCount: f.reviewCount,
                    lapseCount: f.lapseCount,
                    updatedAt: new Date(f.updatedAt),
                  }
                : getInitialFlashcardSchedulingState();

            return {
              ...importedSchedulingState,
              front: f.front,
              back: f.back,
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
