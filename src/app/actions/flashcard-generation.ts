"use server";

import { generateFlashcardsForUser } from "@/features/flashcards/ai-service";
import {
  buildMindmapFlashcardSourceWithImages,
  restoreUsedMindmapImages,
} from "@/features/flashcards/mindmap-source";
import { buildNoteFlashcardSource } from "@/features/flashcards/note-source";
import { countFlashcardsBySubjectForUser } from "@/features/flashcards/queries";
import {
  type GenerateMindmapFlashcardsForm,
  type GenerateNoteFlashcardsForm,
  generateMindmapFlashcardsSchema,
  generateNoteFlashcardsSchema,
} from "@/features/flashcards/validation";
import { getMindmapByIdForUser } from "@/features/mindmaps/queries";
import { getNoteByIdForUser } from "@/features/notes/queries";
import { getSubjectRecordForUser } from "@/features/subjects/queries";
import { LIMITS } from "@/lib/config/limits";
import { runValidatedUserAction } from "@/lib/server/action-runner";
import {
  type ActionErrorResult,
  actionError,
} from "@/lib/server/server-action-errors";

type GenerateFlashcardsResult =
  | { success: true; cards: Array<{ front: string; back: string }> }
  | ActionErrorResult;

export async function generateFlashcardsFromNote(
  data: GenerateNoteFlashcardsForm,
): Promise<GenerateFlashcardsResult> {
  return runValidatedUserAction(
    "flashcard-generation.generateFlashcardsFromNote",
    generateNoteFlashcardsSchema,
    data,
    "flashcards.ai.invalidData",
    async (userId, parsedData) => {
      const [existingNote, target] = await Promise.all([
        getNoteByIdForUser(userId, parsedData.noteId),
        readGenerationTarget(userId, parsedData.subjectId),
      ]);

      if (!existingNote) {
        return actionError("notes.notFound");
      }

      if (!target.success) {
        return target;
      }

      return generateFlashcardsForUser({
        userId,
        subjectName: target.subjectName,
        noteTitle: existingNote.title,
        text: buildNoteFlashcardSource({
          title: existingNote.title,
          content: existingNote.content,
        }),
      });
    },
  );
}

export async function generateFlashcardsFromMindmap(
  data: GenerateMindmapFlashcardsForm,
): Promise<GenerateFlashcardsResult> {
  return runValidatedUserAction(
    "flashcard-generation.generateFlashcardsFromMindmap",
    generateMindmapFlashcardsSchema,
    data,
    "flashcards.ai.invalidData",
    async (userId, parsedData) => {
      const [existingMindmap, target] = await Promise.all([
        getMindmapByIdForUser(userId, parsedData.mindmapId),
        readGenerationTarget(userId, parsedData.subjectId),
      ]);

      if (!existingMindmap) {
        return actionError("mindmaps.notFound");
      }

      if (!target.success) {
        return target;
      }

      const source = buildMindmapFlashcardSourceWithImages({
        title: existingMindmap.title,
        data: existingMindmap.data,
        sourceNodeId: parsedData.sourceNodeId,
      });
      const result = await generateFlashcardsForUser({
        userId,
        subjectName: target.subjectName,
        noteTitle: existingMindmap.title,
        text: source.text,
      });

      if (!result.success || source.images.length === 0) {
        return result;
      }

      return {
        ...result,
        cards: result.cards.map((card) => ({
          front: card.front,
          back: restoreUsedMindmapImages(card.back, source.images),
        })),
      };
    },
  );
}

// The subject the cards will land in must exist and still have room for them.
async function readGenerationTarget(
  userId: string,
  subjectId: string,
): Promise<{ success: true; subjectName: string } | ActionErrorResult> {
  const [existingSubject, currentCount] = await Promise.all([
    getSubjectRecordForUser(userId, subjectId),
    countFlashcardsBySubjectForUser(userId, subjectId),
  ]);

  if (!existingSubject) {
    return actionError("subjects.notFound");
  }

  if (currentCount >= LIMITS.maxFlashcardsPerSubject) {
    return actionError("limits.flashcardLimit", {
      errorParams: { max: LIMITS.maxFlashcardsPerSubject },
    });
  }

  return { success: true, subjectName: existingSubject.name };
}
