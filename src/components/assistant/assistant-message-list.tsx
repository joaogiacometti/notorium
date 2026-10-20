"use client";

import type { ChatStatus } from "ai";
import { useEffect, useRef } from "react";
import {
  AssistantPlainReply,
  AssistantRichReply,
  preloadAssistantRichReply,
} from "@/components/assistant/assistant-rich-reply";
import type { AssistantUIMessage } from "@/features/assistant/types";
import { cn } from "@/lib/utils";

interface AssistantMessageListProps {
  messages: AssistantUIMessage[];
  status: ChatStatus;
}

export function AssistantMessageList({
  messages,
  status,
}: Readonly<AssistantMessageListProps>) {
  const endRef = useRef<HTMLDivElement>(null);
  const lastMessage = messages.at(-1);
  // The reply exists before its first token arrives; until then it reads as
  // "Thinking…" rather than an empty bubble.
  const awaitingFirstToken =
    status === "submitted" ||
    (status === "streaming" &&
      lastMessage?.role === "assistant" &&
      readMessageText(lastMessage) === "");

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
      {messages.filter(hasText).map((message) => (
        <AssistantMessageBubble
          key={message.id}
          message={message}
          streaming={status === "streaming" && message === lastMessage}
        />
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
function hasText(message: AssistantUIMessage): boolean {
  return readMessageText(message) !== "";
}

function readMessageText(message: AssistantUIMessage): string {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("");
}
