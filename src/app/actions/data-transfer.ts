"use server";

import { and, count, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/index";
import {
  assessment,
  attendanceMiss,
  flashcard,
  note,
  subject,
} from "@/db/schema";
import type { MutationResult } from "@/lib/api/contracts";
import { getAuthenticatedUserId } from "@/lib/auth";
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

  const subjects = await db
    .select()
    .from(subject)
    .where(and(eq(subject.userId, userId), isNull(subject.archivedAt)));

  const subjectsWithData = await Promise.all(
    subjects.map(async (s) => {
      const [notes, misses, assessments, flashcards] = await Promise.all([
        templateOnly
          ? Promise.resolve([])
          : db
              .select()
              .from(note)
              .where(and(eq(note.subjectId, s.id), eq(note.userId, userId))),
        templateOnly
          ? Promise.resolve([])
          : db
              .select()
              .from(attendanceMiss)
              .where(
                and(
                  eq(attendanceMiss.subjectId, s.id),
                  eq(attendanceMiss.userId, userId),
                ),
              ),
        db
          .select()
          .from(assessment)
          .where(
            and(eq(assessment.subjectId, s.id), eq(assessment.userId, userId)),
          ),
        templateOnly
          ? Promise.resolve([])
          : db
              .select()
              .from(flashcard)
              .where(
                and(
                  eq(flashcard.subjectId, s.id),
                  eq(flashcard.userId, userId),
                ),
              ),
      ]);

      return {
        name: s.name,
        description: s.description,
        totalClasses: s.totalClasses,
        maxMisses: s.maxMisses,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
        notes: notes.map((n) => ({
          title: n.title,
          content: n.content,
          createdAt: n.createdAt.toISOString(),
          updatedAt: n.updatedAt.toISOString(),
        })),
        attendanceMisses: misses.map((m) => ({
          missDate: m.missDate,
        })),
        assessments: assessments.map((a) => ({
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
        flashcards: flashcards.map((f) => ({
          front: f.front,
          back: f.back,
          state: f.state,
          dueAt: f.dueAt.toISOString(),
          ease: f.ease,
          intervalDays: f.intervalDays,
          learningStep: f.learningStep,
          lastReviewedAt: f.lastReviewedAt?.toISOString() ?? null,
          reviewCount: f.reviewCount,
          lapseCount: f.lapseCount,
          createdAt: f.createdAt.toISOString(),
          updatedAt: f.updatedAt.toISOString(),
        })),
      };
    }),
  );

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    subjects: subjectsWithData,
  };
}

export async function importData(
  raw: unknown,
): Promise<MutationResult & { imported?: number }> {
  const userId = await getAuthenticatedUserId();

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

  for (const importedSubject of data.subjects) {
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

  let importedCount = 0;

  try {
    await db.transaction(async (tx) => {
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
          continue;
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
            importedSubject.flashcards.map((f) => ({
              front: f.front,
              back: f.back,
              state: f.state,
              dueAt: new Date(f.dueAt),
              ease: f.ease,
              intervalDays: f.intervalDays,
              learningStep: f.learningStep,
              lastReviewedAt: f.lastReviewedAt
                ? new Date(f.lastReviewedAt)
                : null,
              reviewCount: f.reviewCount,
              lapseCount: f.lapseCount,
              subjectId,
              userId,
            })),
          );
        }

        importedCount++;
      }
    });
  } catch {
    return actionError("dataTransfer.importFailed");
  }

  revalidatePath("/subjects");
  revalidatePath("/assessments");
  revalidatePath("/flashcards/review");
  return { success: true, imported: importedCount };
}
