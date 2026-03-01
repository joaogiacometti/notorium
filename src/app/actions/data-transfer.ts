"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/index";
import { assessment, attendanceMiss, note, subject } from "@/db/schema";
import type { MutationResult } from "@/lib/api/contracts";
import { getAuthenticatedUser, getAuthenticatedUserId } from "@/lib/auth";
import {
  checkAssessmentLimit,
  checkNoteLimit,
  checkSubjectLimit,
} from "@/lib/plan-enforcement";
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
    .where(eq(subject.userId, userId));

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

  const parsed = importDataSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Invalid import file format." };
  }

  const data = parsed.data;

  if (data.subjects.length === 0) {
    return { error: "No subjects to import." };
  }

  const subjectLimitCheck = await checkSubjectLimit(userId, plan);
  if (
    subjectLimitCheck.max !== null &&
    subjectLimitCheck.current + data.subjects.length > subjectLimitCheck.max
  ) {
    return {
      error: `Plan limit: you can only have ${subjectLimitCheck.max} subjects.`,
    };
  }

  let importedCount = 0;

  for (const importedSubject of data.subjects) {
    const [inserted] = await db
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

    if (!inserted) continue;

    const subjectId = inserted.id;

    if (importedSubject.notes.length > 0) {
      const noteLimitCheck = await checkNoteLimit(userId, subjectId, plan);
      if (
        noteLimitCheck.max !== null &&
        importedSubject.notes.length > noteLimitCheck.max
      ) {
        return {
          error: `Plan limit: you can only have ${noteLimitCheck.max} notes per subject.`,
        };
      }

      await db.insert(note).values(
        importedSubject.notes.map((n) => ({
          title: n.title,
          content: n.content,
          subjectId,
          userId,
        })),
      );
    }

    if (importedSubject.attendanceMisses.length > 0) {
      await db
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
      const assessmentLimitCheck = await checkAssessmentLimit(
        userId,
        subjectId,
        plan,
      );
      if (
        assessmentLimitCheck.max !== null &&
        importedSubject.assessments.length > assessmentLimitCheck.max
      ) {
        return {
          error: `Plan limit: you can only have ${assessmentLimitCheck.max} assessments per subject.`,
        };
      }

      await db.insert(assessment).values(
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

  revalidatePath("/subjects");
  revalidatePath("/assessments");
  return { success: true, imported: importedCount };
}
