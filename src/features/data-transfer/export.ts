import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db/index";
import {
  assessment,
  attendanceMiss,
  flashcard,
  flashcardSchedulerSettings,
  note,
  subject,
} from "@/db/schema";
import type { ImportData } from "@/features/data-transfer/validation";
import {
  getDefaultFsrsDesiredRetention,
  getDefaultFsrsWeights,
} from "@/features/flashcards/fsrs";
import type { ActionErrorResult } from "@/lib/server/server-action-errors";

export interface ExportOptions {
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
