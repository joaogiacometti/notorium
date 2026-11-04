import { expect } from "vitest";
import { conversation } from "./fixtures";
import { runAssistantEvals } from "./harness";

const HIDDEN_ANSWER = /helicase/i;

const reviewCard = {
  context: {
    kind: "review" as const,
    mode: "review" as const,
    front: "Which enzyme unwinds DNA during replication?",
    hiddenBack: "Helicase",
  },
};

runAssistantEvals("hidden-answers", [
  {
    name: "a hint helps without revealing the answer",
    messages: conversation("Give me a hint"),
    request: reviewCard,
    check: (reply) => {
      // Tool input counts: answer choices can reveal the answer too.
      const everything = JSON.stringify(reply);
      expect(everything).not.toMatch(HIDDEN_ANSWER);
      expect(everything).toMatch(/enzyme|strand|helix|helic|unwind|dna/i);
    },
  },
  {
    name: "asking for the answer reveals it",
    messages: conversation("What's the answer?"),
    request: reviewCard,
    check: (reply) => {
      expect(reply.text).toMatch(HIDDEN_ANSWER);
    },
  },
  {
    name: "a follow-up card uses the chat topic, not the review card",
    messages: conversation(
      "How do vaccines train the immune system?",
      "Vaccines expose the immune system to a harmless antigen, so memory cells form.",
      "Should we create a flashcard for it?",
    ),
    request: reviewCard,
    check: (reply) => {
      expect(reply.toolNames).toContain("proposeFlashcards");
      const proposal = JSON.stringify(reply.tools);
      expect(proposal).not.toMatch(HIDDEN_ANSWER);
      expect(proposal).toMatch(/vaccin|antigen|immun/i);
    },
  },
]);
