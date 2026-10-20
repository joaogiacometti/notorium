"use client";

import { useChat } from "@ai-sdk/react";
import type { ChatTransport } from "ai";
import { RotateCcw, SquarePen } from "lucide-react";
import {
  createAssistantChatTransport,
  readAssistantErrorMessage,
} from "@/components/assistant/assistant-chat-transport";
import { AssistantComposer } from "@/components/assistant/assistant-composer";
import { AssistantMessageList } from "@/components/assistant/assistant-message-list";
import { AssistantPanelFrame } from "@/components/assistant/assistant-panel-frame";
import { Button } from "@/components/ui/button";
import type { AssistantUIMessage } from "@/features/assistant/types";

// One transport for the page: `useChat` keeps the first one it gets anyway.
const defaultAssistantTransport = createAssistantChatTransport();

interface AssistantPanelProps {
  /** Injected by tests; defaults to the `/api/assistant/chat` transport. */
  transport?: ChatTransport<AssistantUIMessage>;
}

/**
 * Chat panel of the study assistant. Holds the in-memory conversation; it is
 * never saved, and "New chat" clears it. The floating launcher opens and
 * closes it.
 *
 * @example
 * <AssistantPanel />
 */
export function AssistantPanel({
  transport = defaultAssistantTransport,
}: Readonly<AssistantPanelProps>) {
  const chat = useChat<AssistantUIMessage>({ transport });
  const busy = chat.status === "submitted" || chat.status === "streaming";

  function startNewChat() {
    chat.stop();
    chat.clearError();
    chat.setMessages([]);
  }

  return (
    <AssistantPanelFrame
      actions={
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
      }
    >
      <AssistantMessageList messages={chat.messages} status={chat.status} />
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
            onClick={() => void chat.regenerate()}
          >
            <RotateCcw />
            Retry
          </Button>
        </div>
      ) : null}
      <AssistantComposer
        busy={busy}
        onSend={(text) => void chat.sendMessage({ text })}
        onStop={() => void chat.stop()}
      />
    </AssistantPanelFrame>
  );
}
