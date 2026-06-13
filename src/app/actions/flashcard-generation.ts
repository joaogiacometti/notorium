"use server";

import { getDeckRecordForUser } from "@/features/decks/queries";
import { generateFlashcardsForUser as generateFlashcardsForUserService } from "@/features/flashcards/ai-service";
import { buildMindmapFlashcardSource } from "@/features/flashcards/mindmap-source";
import { buildNoteFlashcardSource } from "@/features/flashcards/note-source";
import { countFlashcardsByDeckForUser } from "@/features/flashcards/queries";
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
import { getActiveSubjectByIdForUser } from "@/features/subjects/queries";
import { LIMITS } from "@/lib/config/limits";
import { runValidatedUserAction } from "@/lib/server/action-runner";
import {
  type ActionErrorResult,
  actionError,
} from "@/lib/server/server-action-errors";

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
      const existingDeck = await getDeckRecordForUser(
        userId,
        parsedData.deckId,
      );

      if (!existingDeck) {
        return actionError("decks.notFound");
      }

      const currentCount = await countFlashcardsByDeckForUser(
        userId,
        parsedData.deckId,
      );

      if (currentCount >= LIMITS.maxFlashcardsPerDeck) {
        return actionError("limits.flashcardLimit", {
          errorParams: { max: LIMITS.maxFlashcardsPerDeck },
        });
      }

      const result = await generateFlashcardsForUserService({
        userId,
        deckName: existingDeck.name,
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
      const [existingNote, existingDeck] = await Promise.all([
        getNoteByIdForUser(userId, parsedData.noteId),
        getDeckRecordForUser(userId, parsedData.deckId),
      ]);

      if (!existingNote) {
        return actionError("notes.notFound");
      }

      if (!existingDeck) {
        return actionError("decks.notFound");
      }

      const currentCount = await countFlashcardsByDeckForUser(
        userId,
        parsedData.deckId,
      );

      if (currentCount >= LIMITS.maxFlashcardsPerDeck) {
        return actionError("limits.flashcardLimit", {
          errorParams: { max: LIMITS.maxFlashcardsPerDeck },
        });
      }

      const subject = await getActiveSubjectByIdForUser(
        userId,
        existingNote.subjectId,
      );
      const result = await generateFlashcardsForUserService({
        userId,
        subjectName: subject?.name,
        deckName: existingDeck.name,
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
      const [existingMindmap, existingDeck] = await Promise.all([
        getMindmapByIdForUser(userId, parsedData.mindmapId),
        getDeckRecordForUser(userId, parsedData.deckId),
      ]);

      if (!existingMindmap) {
        return actionError("mindmaps.notFound");
      }

      if (!existingDeck) {
        return actionError("decks.notFound");
      }

      const currentCount = await countFlashcardsByDeckForUser(
        userId,
        parsedData.deckId,
      );

      if (currentCount >= LIMITS.maxFlashcardsPerDeck) {
        return actionError("limits.flashcardLimit", {
          errorParams: { max: LIMITS.maxFlashcardsPerDeck },
        });
      }

      const subject = await getActiveSubjectByIdForUser(
        userId,
        existingMindmap.subjectId,
      );
      const result = await generateFlashcardsForUserService({
        userId,
        subjectName: subject?.name,
        deckName: existingDeck.name,
        noteTitle: existingMindmap.title,
        text: buildMindmapFlashcardSource({
          title: existingMindmap.title,
          data: existingMindmap.data,
        }),
      });

      return result;
    },
  );
}
