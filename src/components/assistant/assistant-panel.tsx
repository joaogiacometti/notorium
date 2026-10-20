"use client";

import { useChat } from "@ai-sdk/react";
import type { ChatTransport } from "ai";
import { Minus, RotateCcw, SquarePen } from "lucide-react";
import {
  createAssistantChatTransport,
  readAssistantErrorMessage,
} from "@/components/assistant/assistant-chat-transport";
import { AssistantComposer } from "@/components/assistant/assistant-composer";
import { AssistantMessageList } from "@/components/assistant/assistant-message-list";
import { AssistantPanelFrame } from "@/components/assistant/assistant-panel-frame";
import { useFlashcardProposalOutcomes } from "@/components/assistant/use-flashcard-proposal-outcomes";
import { Button } from "@/components/ui/button";
import type { AssistantUIMessage } from "@/features/assistant/types";

// One transport for the page: `useChat` keeps the first one it gets anyway.
const defaultAssistantTransport = createAssistantChatTransport();

interface AssistantPanelProps {
  /** Injected by tests; defaults to the `/api/assistant/chat` transport. */
  transport?: ChatTransport<AssistantUIMessage>;
  /** Hides the panel; the launcher keeps it mounted, so the chat survives. */
  onMinimize: () => void;
}

/**
 * Chat panel of the study assistant. Holds the in-memory conversation; it is
 * never saved, and "New chat" clears it. Minimize (or the floating launcher)
 * hides the panel without clearing it. Flashcard outcomes are recorded on
 * their tool call without sending a turn, so they reach the model with the
 * user's next message instead of spending an assistant reply.
 *
 * @example
 * <AssistantPanel onMinimize={() => setOpen(false)} />
 */
export function AssistantPanel({
  transport = defaultAssistantTransport,
  onMinimize,
}: Readonly<AssistantPanelProps>) {
  const chat = useChat<AssistantUIMessage>({ transport });
  const busy = chat.status === "submitted" || chat.status === "streaming";
  const proposals = useFlashcardProposalOutcomes(chat);

  function startNewChat() {
    chat.stop();
    chat.clearError();
    chat.setMessages([]);
    proposals.reset();
  }

  // Open cards are settled first so the model hears they were skipped.
  async function sendText(text: string) {
    await proposals.skipOpenCards();
    await chat.sendMessage({ text });
  }

  async function retryLastMessage() {
    await proposals.skipOpenCards();
    await chat.regenerate();
  }

  return (
    <AssistantPanelFrame
      actions={
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onMinimize}
            aria-label="Minimize study assistant"
            aria-controls="study-assistant-panel"
          >
            <Minus className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={startNewChat}
            disabled={chat.messages.length === 0}
            aria-label="New chat"
          >
            <SquarePen className="size-4" />
          </Button>
        </div>
      }
    >
      <AssistantMessageList
        messages={chat.messages}
        status={chat.status}
        proposals={proposals}
      />
      {chat.error ? (
        <div
          role="alert"
          className="flex items-center gap-2 border-t border-border/60 bg-(--intent-danger-bg) px-4 py-2 text-xs text-(--intent-danger-text)"
        >
          <p className="flex-1">{readAssistantErrorMessage(chat.error)}</p>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => void retryLastMessage()}
          >
            <RotateCcw />
            Retry
          </Button>
        </div>
      ) : null}
      <AssistantComposer
        busy={busy}
        onSend={(text) => void sendText(text)}
        onStop={() => void chat.stop()}
      />
    </AssistantPanelFrame>
  );
}
