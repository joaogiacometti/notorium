"use client";

import type { ChatStatus } from "ai";
import { useEffect, useRef } from "react";
import { AssistantAnswerChoices } from "@/components/assistant/assistant-answer-choices";
import {
  AssistantDocumentProposal,
  readDocumentProposalParts,
} from "@/components/assistant/assistant-document-proposal";
import { AssistantFlashcardProposal } from "@/components/assistant/assistant-flashcard-proposal";
import { AssistantLibraryResults } from "@/components/assistant/assistant-library-results";
import {
  AssistantPlainReply,
  AssistantRichReply,
  preloadAssistantRichReply,
} from "@/components/assistant/assistant-rich-reply";
import type { FlashcardProposalControls } from "@/components/assistant/use-flashcard-proposal-outcomes";
import type { AssistantUIMessage } from "@/features/assistant/types";
import {
  isAssistantReplyInFlight,
  readFlashcardProposalParts,
  readLibrarySearchParts,
  readProposalSource,
} from "@/features/assistant/utils";
import { splitDollarMath } from "@/lib/math/dollar-math";
import { cn } from "@/lib/utils";

interface AssistantMessageListProps {
  messages: AssistantUIMessage[];
  status: ChatStatus;
  proposals: FlashcardProposalControls;
  onOpenLibraryHit?: () => void;
  onAnswer?: (text: string) => Promise<boolean>;
}

export function AssistantMessageList({
  messages,
  status,
  proposals,
  onOpenLibraryHit,
  onAnswer,
}: Readonly<AssistantMessageListProps>) {
  const endRef = useRef<HTMLDivElement>(null);
  const lastMessage = messages.at(-1);
  const busy = isAssistantReplyInFlight(status);
  // The reply exists before its first token arrives, and a finished search is
  // followed by another model step; until text streams in, it reads as
  // "Thinking…" rather than a stalled chat.
  const awaitingFirstToken =
    status === "submitted" ||
    (status === "streaming" &&
      lastMessage?.role === "assistant" &&
      (!hasVisibleContent(lastMessage, busy) || awaitsNextStep(lastMessage)));

  // Runs after every render: each streamed chunk re-renders the list, and the
  // view should follow the reply as it grows.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  });

  useEffect(preloadAssistantRichReply, []);

  if (messages.length === 0) {
    return (
      <p className="flex flex-1 items-center px-6 text-center text-sm text-muted-foreground">
        Ask about anything you want to learn. Type /bypass to skip learning
        support.
      </p>
    );
  }

  return (
    <div
      className="flex-1 space-y-3 overflow-y-auto px-4 py-3"
      aria-live="polite"
    >
      {messages
        .filter((message) =>
          hasVisibleContent(message, busy && message === lastMessage),
        )
        .map((message) => (
          <div key={message.id} className="space-y-2">
            {readMessageText(message) === "" ? null : (
              <AssistantMessageBubble
                message={message}
                streaming={status === "streaming" && message === lastMessage}
              />
            )}
            {readLibrarySearchParts(message).map((search) => (
              <AssistantLibraryResults
                key={search.toolCallId}
                search={search}
                onOpenHit={onOpenLibraryHit}
              />
            ))}
            {message.parts.flatMap((part) =>
              part.type === "tool-showAnswerChoices" &&
              part.state === "output-available"
                ? [
                    <AssistantAnswerChoices
                      key={part.toolCallId}
                      question={part.output.question}
                      options={part.output.options}
                      disabled={busy || message !== lastMessage || !onAnswer}
                      onAnswer={onAnswer}
                    />,
                  ]
                : [],
            )}
            {readDocumentProposalParts(
              message,
              busy && message === lastMessage,
            ).map((proposal) => (
              <AssistantDocumentProposal
                key={proposal.toolCallId}
                proposal={proposal}
              />
            ))}
            {readFlashcardProposalParts(message).map((proposal) => (
              <AssistantFlashcardProposal
                key={proposal.toolCallId}
                proposal={proposal}
                source={readProposalSource(messages, message.id)}
                disabled={busy}
                controls={proposals}
              />
            ))}
          </div>
        ))}
      {awaitingFirstToken ? (
        <p className="text-xs text-muted-foreground">Thinking…</p>
      ) : null}
      <div ref={endRef} />
    </div>
  );
}

function AssistantMessageBubble({
  message,
  streaming,
}: Readonly<{ message: AssistantUIMessage; streaming: boolean }>) {
  const fromUser = message.role === "user";
  const text = readMessageText(message);
  const userHasMath =
    fromUser && splitDollarMath(text).some((part) => part.kind === "math");

  return (
    <div
      className={cn(
        "max-w-[85%] rounded-lg px-3 py-2 text-sm",
        fromUser
          ? "ml-auto bg-muted text-foreground whitespace-pre-wrap"
          : "bg-muted/50",
      )}
    >
      {(fromUser && !userHasMath) || streaming ? (
        <AssistantPlainReply text={text} />
      ) : (
        // Rendered as rich text only once complete: half-streamed LaTeX or
        // code fences would flash as broken markup on every chunk.
        <AssistantRichReply text={text} />
      )}
    </div>
  );
}

// A server-run tool finished (or a new step began) and no text followed yet.
function awaitsNextStep(message: AssistantUIMessage): boolean {
  const last = message.parts.at(-1);
  if (!last) return true;
  if (last.type === "step-start") return true;
  if (last.type === "text") return last.text === "";
  return (
    last.type === "tool-searchLibrary" && last.state === "output-available"
  );
}

// Replies stopped before their first token have nothing to show.
function hasVisibleContent(
  message: AssistantUIMessage,
  replyInFlight = false,
): boolean {
  return (
    readMessageText(message) !== "" ||
    readFlashcardProposalParts(message).length > 0 ||
    readLibrarySearchParts(message).length > 0 ||
    readDocumentProposalParts(message, replyInFlight).length > 0 ||
    message.parts.some(
      (part) =>
        part.type === "tool-showAnswerChoices" &&
        part.state === "output-available",
    )
  );
}

// A reply that searched first may hold text from both steps; a blank line
// keeps the two from running together.
function readMessageText(message: AssistantUIMessage): string {
  return message.parts
    .flatMap((part) => (part.type === "text" && part.text ? [part.text] : []))
    .join("\n\n");
}
