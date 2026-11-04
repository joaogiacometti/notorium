import { expect } from "vitest";
import { flashcardProposalInputSchema } from "@/features/assistant/tools";
import { conversation } from "./fixtures";
import { runAssistantEvals } from "./harness";

runAssistantEvals("flashcards", [
  {
    name: "a requested count of one proposes exactly one card",
    messages: conversation("Make 1 flashcard about what ATP does"),
    request: { bypassLearning: true },
    check: (reply) => {
      expect(reply.toolNames).toEqual(["proposeFlashcards"]);
      const { cards } = flashcardProposalInputSchema.parse(
        reply.tools[0]?.input,
      );
      expect(cards).toHaveLength(1);
      expect(JSON.stringify(cards)).toMatch(/atp/i);
    },
  },
]);
