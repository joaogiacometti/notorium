import { and, eq, isNull } from "drizzle-orm";
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
import type { ImportData } from "@/features/data-transfer/validation";
import {
  getDefaultFsrsDesiredRetention,
  getDefaultFsrsWeights,
  normalizeFsrsDesiredRetention,
  parseFsrsWeights,
} from "@/features/flashcards/fsrs";
import { removeInternalAttachmentImagesForTransfer } from "@/lib/editor/rich-text";
import type { ActionErrorResult } from "@/lib/server/server-action-errors";

export interface ExportOptions {
  templateOnly?: boolean;
}

function buildDeckPaths(
  decks: Array<{ id: string; name: string; parentDeckId: string | null }>,
): Map<string, string> {
  const pathById = new Map<string, string>();
  const deckById = new Map(decks.map((d) => [d.id, d]));

  function getPath(deckId: string): string {
    const cached = pathById.get(deckId);
    if (cached) {
      return cached;
    }

    const d = deckById.get(deckId);
    if (!d) {
      return "";
    }

    const path = d.parentDeckId
      ? `${getPath(d.parentDeckId)}::${d.name}`
      : d.name;
    pathById.set(deckId, path);
    return path;
  }

  for (const d of decks) {
    getPath(d.id);
  }

  return pathById;
}

function _getOptionalRowField(row: unknown, field: string): unknown {
  if (typeof row !== "object" || row === null) {
    return undefined;
  }

  return (row as Record<string, unknown>)[field];
}

export async function exportDataForUser(
  userId: string,
  options: ExportOptions = {},
): Promise<ImportData | ActionErrorResult> {
  const { templateOnly = false } = options;
  const [schedulerSettings] = await getDb()
    .select()
    .from(flashcardSchedulerSettings)
    .where(eq(flashcardSchedulerSettings.userId, userId))
    .limit(1);

  const subjects = await getDb()
    .select()
    .from(subject)
    .where(and(eq(subject.userId, userId), isNull(subject.archivedAt)));

  const subjectIds = subjects.map((s) => s.id);

  const [notes, misses, assessments, flashcards, decks] = await Promise.all([
    templateOnly || subjectIds.length === 0
      ? Promise.resolve([])
      : getDb()
          .select()
          .from(note)
          .where(and(eq(note.userId, userId))),
    templateOnly || subjectIds.length === 0
      ? Promise.resolve([])
      : getDb()
          .select()
          .from(attendanceMiss)
          .where(eq(attendanceMiss.userId, userId)),
    subjectIds.length === 0
      ? Promise.resolve([])
      : getDb().select().from(assessment).where(eq(assessment.userId, userId)),
    templateOnly
      ? Promise.resolve([])
      : getDb().select().from(flashcard).where(eq(flashcard.userId, userId)),
    templateOnly
      ? Promise.resolve([])
      : getDb()
          .select({
            id: deck.id,
            name: deck.name,
            description: deck.description,
            parentDeckId: deck.parentDeckId,
          })
          .from(deck)
          .where(eq(deck.userId, userId)),
  ]);

  const deckPathById = buildDeckPaths(decks);

  const notesBySubjectId = groupByField(notes, "subjectId");
  const missesBySubjectId = groupByField(misses, "subjectId");
  const assessmentsBySubjectId = groupByField(assessments, "subjectId");

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    flashcardScheduler: schedulerSettings
      ? {
          desiredRetention: normalizeFsrsDesiredRetention(
            schedulerSettings.desiredRetention,
          ),
          weights: parseFsrsWeights(schedulerSettings.weights),
        }
      : {
          desiredRetention: getDefaultFsrsDesiredRetention(),
          weights: getDefaultFsrsWeights(),
        },
    decks: decks.map((d) => ({
      path: deckPathById.get(d.id) ?? d.name,
      name: d.name,
      description: d.description ?? null,
    })),
    flashcards: flashcards.map((fc) => ({
      front: removeInternalAttachmentImagesForTransfer(fc.front),
      back: removeInternalAttachmentImagesForTransfer(fc.back),
      deckName: fc.deckId ? (deckPathById.get(fc.deckId) ?? "") : undefined,
      deckPath: deckPathById.get(fc.deckId) ?? "",
      state: fc.state,
      dueAt: fc.dueAt.toISOString(),
      stability:
        fc.stability === null ? null : Number.parseFloat(String(fc.stability)),
      difficulty:
        fc.difficulty === null
          ? null
          : Number.parseFloat(String(fc.difficulty)),
      ease: fc.ease,
      intervalDays: fc.intervalDays,
      learningStep: fc.learningStep,
      lastReviewedAt: fc.lastReviewedAt?.toISOString() ?? null,
      reviewCount: fc.reviewCount,
      lapseCount: fc.lapseCount,
      createdAt: fc.createdAt.toISOString(),
      updatedAt: fc.updatedAt.toISOString(),
    })),
    subjects: subjects.map((item) => ({
      name: item.name,
      description: item.description,
      totalClasses: item.totalClasses,
      maxMisses: item.maxMisses,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      notes: (notesBySubjectId.get(item.id) ?? []).map((currentNote) => ({
        title: currentNote.title,
        content:
          currentNote.content === null
            ? null
            : removeInternalAttachmentImagesForTransfer(currentNote.content),
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
          weight: templateOnly ? null : currentAssessment.weight,
          createdAt: currentAssessment.createdAt.toISOString(),
          updatedAt: currentAssessment.updatedAt.toISOString(),
        }),
      ),
    })),
  };
}

function groupByField<T extends Record<string, unknown>>(
  rows: T[],
  field: keyof T & string,
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();

  for (const row of rows) {
    const key = String(row[field]);
    const existing = grouped.get(key);
    if (existing) {
      existing.push(row);
    } else {
      grouped.set(key, [row]);
    }
  }

  return grouped;
}
