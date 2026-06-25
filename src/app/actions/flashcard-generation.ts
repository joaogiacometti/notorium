"use server";

import { generateFlashcardsForUser as generateFlashcardsForUserService } from "@/features/flashcards/ai-service";
import { buildMindmapFlashcardSourceWithImages } from "@/features/flashcards/mindmap-source";
import { buildNoteFlashcardSource } from "@/features/flashcards/note-source";
import { countFlashcardsBySubjectForUser } from "@/features/flashcards/queries";
import {
  type GenerateFlashcardsForm,
  type GenerateMindmapFlashcardsForm,
  type GenerateNoteFlashcardsForm,
  generateFlashcardsSchema,
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

function restoreUsedMindmapImages(value: string, images: string[]): string {
  let result = value;
  images.forEach((image, index) => {
    result = result.replaceAll(`{{IMAGE_${index}}}`, image);
  });
  return result;
}

export async function generateFlashcards(
  data: GenerateFlashcardsForm,
): Promise<
  | { success: true; cards: Array<{ front: string; back: string }> }
  | ActionErrorResult
> {
  return runValidatedUserAction(
    generateFlashcardsSchema,
    data,
    "flashcards.ai.invalidData",
    async (userId, parsedData) => {
      const existingSubject = await getSubjectRecordForUser(
        userId,
        parsedData.subjectId,
      );

      if (!existingSubject) {
        return actionError("subjects.notFound");
      }

      const currentCount = await countFlashcardsBySubjectForUser(
        userId,
        parsedData.subjectId,
      );

      if (currentCount >= LIMITS.maxFlashcardsPerSubject) {
        return actionError("limits.flashcardLimit", {
          errorParams: { max: LIMITS.maxFlashcardsPerSubject },
        });
      }

      const result = await generateFlashcardsForUserService({
        userId,
        subjectName: existingSubject.name,
        text: parsedData.text,
      });

      return result;
    },
  );
}

export async function generateFlashcardsFromNote(
  data: GenerateNoteFlashcardsForm,
): Promise<
  | { success: true; cards: Array<{ front: string; back: string }> }
  | ActionErrorResult
> {
  return runValidatedUserAction(
    generateNoteFlashcardsSchema,
    data,
    "flashcards.ai.invalidData",
    async (userId, parsedData) => {
      const [existingNote, existingSubject] = await Promise.all([
        getNoteByIdForUser(userId, parsedData.noteId),
        getSubjectRecordForUser(userId, parsedData.subjectId),
      ]);

      if (!existingNote) {
        return actionError("notes.notFound");
      }

      if (!existingSubject) {
        return actionError("subjects.notFound");
      }

      const currentCount = await countFlashcardsBySubjectForUser(
        userId,
        parsedData.subjectId,
      );

      if (currentCount >= LIMITS.maxFlashcardsPerSubject) {
        return actionError("limits.flashcardLimit", {
          errorParams: { max: LIMITS.maxFlashcardsPerSubject },
        });
      }

      const result = await generateFlashcardsForUserService({
        userId,
        subjectName: existingSubject.name,
        noteTitle: existingNote.title,
        text: buildNoteFlashcardSource({
          title: existingNote.title,
          content: existingNote.content,
        }),
      });

      return result;
    },
  );
}

export async function generateFlashcardsFromMindmap(
  data: GenerateMindmapFlashcardsForm,
): Promise<
  | { success: true; cards: Array<{ front: string; back: string }> }
  | ActionErrorResult
> {
  return runValidatedUserAction(
    generateMindmapFlashcardsSchema,
    data,
    "flashcards.ai.invalidData",
    async (userId, parsedData) => {
      const [existingMindmap, existingSubject] = await Promise.all([
        getMindmapByIdForUser(userId, parsedData.mindmapId),
        getSubjectRecordForUser(userId, parsedData.subjectId),
      ]);

      if (!existingMindmap) {
        return actionError("mindmaps.notFound");
      }

      if (!existingSubject) {
        return actionError("subjects.notFound");
      }

      const currentCount = await countFlashcardsBySubjectForUser(
        userId,
        parsedData.subjectId,
      );

      if (currentCount >= LIMITS.maxFlashcardsPerSubject) {
        return actionError("limits.flashcardLimit", {
          errorParams: { max: LIMITS.maxFlashcardsPerSubject },
        });
      }

      const source = buildMindmapFlashcardSourceWithImages({
        title: existingMindmap.title,
        data: existingMindmap.data,
      });
      const result = await generateFlashcardsForUserService({
        userId,
        subjectName: existingSubject.name,
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
