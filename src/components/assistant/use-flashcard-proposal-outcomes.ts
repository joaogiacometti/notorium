"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { useEffect, useState } from "react";
import type { FlashcardProposalOutcome } from "@/features/assistant/tools";
import type {
  AssistantFlashcardProposalPart,
  AssistantUIMessage,
} from "@/features/assistant/types";
import { readFlashcardProposalParts } from "@/features/assistant/utils";

type ProposalChat = Pick<
  UseChatHelpers<AssistantUIMessage>,
  "messages" | "addToolOutput"
>;

/** A card is either waiting for the user or settled with an outcome. */
export type FlashcardCardStatus = "open" | FlashcardProposalOutcome;

/** Per-card view and actions for the proposals of one chat. */
export interface FlashcardProposalControls {
  statusOf: (
    part: AssistantFlashcardProposalPart,
    index: number,
  ) => FlashcardCardStatus;
  decide: (
    part: AssistantFlashcardProposalPart,
    index: number,
    outcome: FlashcardProposalOutcome,
  ) => void;
  restore: (part: AssistantFlashcardProposalPart, index: number) => void;
  /** Settles every open card as "skipped"; awaited before the next send. */
  skipOpenCards: () => Promise<void>;
  reset: () => void;
}

type CardDecisions = Record<string, Record<number, FlashcardProposalOutcome>>;

/**
 * Tracks what the user did with each proposed flashcard and records it on the
 * tool call. A proposal's output is written once every card is decided, and
 * rewritten when a skipped card is restored and decided again. Cards still
 * open when the user sends a message become "skipped", so the model learns
 * they were not saved instead of never hearing about them.
 *
 * @example
 * const proposals = useFlashcardProposalOutcomes(chat);
 * await proposals.skipOpenCards();
 * void chat.sendMessage({ text });
 */
export function useFlashcardProposalOutcomes(
  chat: ProposalChat,
): FlashcardProposalControls {
  const [decisions, setDecisions] = useState<CardDecisions>({});
  const [restored, setRestored] = useState<ReadonlySet<string>>(new Set());
  const { messages, addToolOutput } = chat;

  // Flushed from an effect so cards decided at the same time (two creates
  // finishing together) all land in one output.
  useEffect(() => {
    for (const part of readProposalParts(messages)) {
      const outcomes = mergeOutcomes(part, decisions[part.toolCallId]);
      if (outcomes && !hasRecordedOutcomes(part, outcomes)) {
        void addToolOutput({
          tool: "proposeFlashcards",
          toolCallId: part.toolCallId,
          output: { outcomes },
        });
      }
    }
  }, [messages, decisions, addToolOutput]);

  function decide(
    part: AssistantFlashcardProposalPart,
    index: number,
    outcome: FlashcardProposalOutcome,
  ) {
    setDecisions((current) => ({
      ...current,
      [part.toolCallId]: { ...current[part.toolCallId], [index]: outcome },
    }));
    setRestored((current) => withoutKey(current, cardKey(part, index)));
  }

  async function skipOpenCards() {
    setRestored(new Set());
    await Promise.all(
      readProposalParts(messages)
        .filter(isAwaitingUser)
        .map((part) =>
          addToolOutput({
            tool: "proposeFlashcards",
            toolCallId: part.toolCallId,
            output: {
              outcomes: skipUndecided(part, decisions[part.toolCallId]),
            },
          }),
        ),
    );
  }

  return {
    statusOf: (part, index) =>
      restored.has(cardKey(part, index))
        ? "open"
        : (decisions[part.toolCallId]?.[index] ??
          recordedOutcome(part, index) ??
          "open"),
    decide,
    restore: (part, index) =>
      setRestored((current) => new Set(current).add(cardKey(part, index))),
    skipOpenCards,
    reset: () => {
      setDecisions({});
      setRestored(new Set());
    },
  };
}

function readProposalParts(
  messages: AssistantUIMessage[],
): AssistantFlashcardProposalPart[] {
  return messages.flatMap(readFlashcardProposalParts);
}

function recordedOutcome(
  part: AssistantFlashcardProposalPart,
  index: number,
): FlashcardProposalOutcome | undefined {
  return part.state === "output-available"
    ? part.output.outcomes[index]
    : undefined;
}

// Every card's outcome, or null while any card is still undecided.
function mergeOutcomes(
  part: AssistantFlashcardProposalPart,
  decided: Record<number, FlashcardProposalOutcome> | undefined,
): FlashcardProposalOutcome[] | null {
  if (part.state !== "input-available" && part.state !== "output-available") {
    return null;
  }

  const outcomes = part.input.cards.map(
    (_, index) => decided?.[index] ?? recordedOutcome(part, index),
  );
  return outcomes.every((outcome) => outcome !== undefined) ? outcomes : null;
}

type AwaitingProposalPart = Extract<
  AssistantFlashcardProposalPart,
  { state: "input-available" }
>;

function isAwaitingUser(
  part: AssistantFlashcardProposalPart,
): part is AwaitingProposalPart {
  return part.state === "input-available";
}

function skipUndecided(
  part: AwaitingProposalPart,
  decided: Record<number, FlashcardProposalOutcome> | undefined,
): FlashcardProposalOutcome[] {
  return part.input.cards.map((_, index) => decided?.[index] ?? "skipped");
}

function hasRecordedOutcomes(
  part: AssistantFlashcardProposalPart,
  outcomes: FlashcardProposalOutcome[],
): boolean {
  return (
    part.state === "output-available" &&
    outcomes.every((outcome, index) => part.output.outcomes[index] === outcome)
  );
}

function cardKey(part: AssistantFlashcardProposalPart, index: number): string {
  return `${part.toolCallId}:${index}`;
}

function withoutKey(
  set: ReadonlySet<string>,
  key: string,
): ReadonlySet<string> {
  if (!set.has(key)) {
    return set;
  }

  const next = new Set(set);
  next.delete(key);
  return next;
}
