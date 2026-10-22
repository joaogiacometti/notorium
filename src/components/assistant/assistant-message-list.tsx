"use client";

import type { ChatStatus } from "ai";
import { useEffect, useRef } from "react";
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
import { cn } from "@/lib/utils";

interface AssistantMessageListProps {
  messages: AssistantUIMessage[];
  status: ChatStatus;
  proposals: FlashcardProposalControls;
  onOpenLibraryHit?: () => void;
}

export function AssistantMessageList({
  messages,
  status,
  proposals,
  onOpenLibraryHit,
}: Readonly<AssistantMessageListProps>) {
  const endRef = useRef<HTMLDivElement>(null);
  const lastMessage = messages.at(-1);
  // The reply exists before its first token arrives; until then it reads as
  // "Thinking…" rather than an empty bubble.
  const awaitingFirstToken =
    status === "submitted" ||
    (status === "streaming" &&
      lastMessage?.role === "assistant" &&
      !hasVisibleContent(lastMessage));
  const busy = isAssistantReplyInFlight(status);

  // Runs after every render: each streamed chunk re-renders the list, and the
  // view should follow the reply as it grows.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  });

  useEffect(preloadAssistantRichReply, []);

  if (messages.length === 0) {
    return (
      <p className="flex flex-1 items-center px-6 text-center text-sm text-muted-foreground">
        Ask about a concept you're studying, request a worked example, or ask to
        be quizzed.
      </p>
    );
  }

  return (
    <div
      className="flex-1 space-y-3 overflow-y-auto px-4 py-3"
      aria-live="polite"
    >
      {messages.filter(hasVisibleContent).map((message) => (
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
  const text = readMessageText(message);
  const fromUser = message.role === "user";

  return (
    <div
      className={cn(
        "max-w-[85%] rounded-lg px-3 py-2 text-sm",
        fromUser
          ? "ml-auto bg-primary text-primary-foreground whitespace-pre-wrap"
          : "bg-muted/50",
      )}
    >
      {fromUser || streaming ? (
        <AssistantPlainReply text={text} />
      ) : (
        // Rendered as rich text only once complete: half-streamed LaTeX or
        // code fences would flash as broken markup on every chunk.
        <AssistantRichReply text={text} />
      )}
    </div>
  );
}

// Replies stopped before their first token have nothing to show.
function hasVisibleContent(message: AssistantUIMessage): boolean {
  return (
    readMessageText(message) !== "" ||
    readFlashcardProposalParts(message).length > 0 ||
    readLibrarySearchParts(message).length > 0
  );
}

// A reply that searched first may hold text from both steps; a blank line
// keeps the two from running together.
function readMessageText(message: AssistantUIMessage): string {
  return message.parts
    .flatMap((part) => (part.type === "text" && part.text ? [part.text] : []))
    .join("\n\n");
}
