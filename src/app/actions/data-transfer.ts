"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/index";
import { assessment, attendanceMiss, note, subject } from "@/db/schema";
import type { MutationResult } from "@/lib/api/contracts";
import { getAuthenticatedUser, getAuthenticatedUserId } from "@/lib/auth";
import { checkSubjectLimit } from "@/lib/plan-enforcement";
import { getPlanLimits } from "@/lib/plan-limits";
import { actionError } from "@/lib/server-action-errors";
import {
  type ImportData,
  importDataSchema,
} from "@/lib/validations/data-transfer";

interface ExportOptions {
  templateOnly?: boolean;
}

export async function exportData(
  options: ExportOptions = {},
): Promise<ImportData> {
  const { templateOnly = false } = options;
  const userId = await getAuthenticatedUserId();

  const subjects = await db
    .select()
    .from(subject)
    .where(and(eq(subject.userId, userId), isNull(subject.archivedAt)));

  const subjectsWithData = await Promise.all(
    subjects.map(async (s) => {
      const [notes, misses, assessments] = await Promise.all([
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
      ]);

      return {
        name: s.name,
        description: s.description,
        totalClasses: s.totalClasses,
        maxMisses: s.maxMisses,
        notesEnabled: s.notesEnabled,
        gradesEnabled: s.gradesEnabled,
        attendanceEnabled: s.attendanceEnabled,
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
  const { userId, plan } = await getAuthenticatedUser();
  const limits = getPlanLimits(plan);

  const parsed = importDataSchema.safeParse(raw);
  if (!parsed.success) {
    return actionError("dataTransfer.invalidImportFormat");
  }

  const data = parsed.data;

  if (data.subjects.length === 0) {
    return actionError("dataTransfer.noSubjectsToImport");
  }

  const subjectLimitCheck = await checkSubjectLimit(userId, plan);
  if (
    subjectLimitCheck.max !== null &&
    subjectLimitCheck.current + data.subjects.length > subjectLimitCheck.max
  ) {
    return actionError("plan.subjectImportLimit", {
      errorParams: { max: subjectLimitCheck.max },
    });
  }

  for (const importedSubject of data.subjects) {
    if (
      limits.maxNotesPerSubject !== null &&
      importedSubject.notes.length > limits.maxNotesPerSubject
    ) {
      return actionError("plan.noteLimit", {
        errorParams: { max: limits.maxNotesPerSubject },
      });
    }

    if (
      limits.maxAssessmentsPerSubject !== null &&
      importedSubject.assessments.length > limits.maxAssessmentsPerSubject
    ) {
      return actionError("plan.assessmentLimit", {
        errorParams: { max: limits.maxAssessmentsPerSubject },
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
            notesEnabled: importedSubject.notesEnabled,
            gradesEnabled: importedSubject.gradesEnabled,
            attendanceEnabled: importedSubject.attendanceEnabled,
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

        importedCount++;
      }
    });
  } catch {
    return actionError("dataTransfer.importFailed");
  }

  revalidatePath("/subjects");
  revalidatePath("/assessments");
  return { success: true, imported: importedCount };
}
