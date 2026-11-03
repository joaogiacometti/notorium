"use client";

import type { ChatStatus } from "ai";
import { useEffect, useRef } from "react";
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
import { AssistantStudyQuestion } from "@/components/assistant/assistant-study-question";
import type { FlashcardProposalControls } from "@/components/assistant/use-flashcard-proposal-outcomes";
import type { AssistantUIMessage } from "@/features/assistant/types";
import {
  isAssistantReplyInFlight,
  readFlashcardProposalParts,
  readGuidedLessonParts,
  readGuidedLessonTransitions,
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
  const lessonTransitions = readGuidedLessonTransitions(messages);
  // The reply exists before its first token arrives, and a finished search or
  // lesson marker is followed by another model step; until text streams in,
  // it reads as "Thinking…" rather than a stalled chat.
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
        Ask about your material, request a worked example, or ask to be quizzed.
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
            {readGuidedLessonParts(message).map((part) => (
              <GuidedLessonMarker
                key={part.toolCallId}
                part={part}
                changesState={lessonTransitions.has(part.toolCallId)}
              />
            ))}
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
              part.type === "tool-askStudyQuestion" &&
              part.state === "output-available"
                ? [
                    <AssistantStudyQuestion
                      key={part.toolCallId}
                      question={part.output}
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

// A start repeated during a lesson shows nothing; one the user ended from the
// indicator also shows where the lesson stopped.
function GuidedLessonMarker({
  part,
  changesState,
}: Readonly<{
  part: ReturnType<typeof readGuidedLessonParts>[number];
  changesState: boolean;
}>) {
  const lines = [
    changesState ? `Guided lesson started · ${part.output.topic}` : null,
    part.output.endedByUser ? "Guided lesson ended" : null,
  ].filter((line) => line !== null);
  return lines.map((line) => (
    <p key={line} className="text-xs text-muted-foreground">
      {line}
    </p>
  ));
}

function AssistantMessageBubble({
  message,
  streaming,
}: Readonly<{ message: AssistantUIMessage; streaming: boolean }>) {
  const fromUser = message.role === "user";
  const text =
    fromUser && message.metadata?.lessonSummary
      ? "End lesson · Summary"
      : readMessageText(message);
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
    (last.type === "tool-startGuidedLesson" ||
      last.type === "tool-endGuidedLesson" ||
      last.type === "tool-searchLibrary") &&
    last.state === "output-available"
  );
}

// Replies stopped before their first token have nothing to show.
function hasVisibleContent(
  message: AssistantUIMessage,
  replyInFlight = false,
): boolean {
  return (
    readMessageText(message) !== "" ||
    readGuidedLessonParts(message).length > 0 ||
    readFlashcardProposalParts(message).length > 0 ||
    readLibrarySearchParts(message).length > 0 ||
    readDocumentProposalParts(message, replyInFlight).length > 0 ||
    message.parts.some(
      (part) =>
        part.type === "tool-askStudyQuestion" &&
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
