"use client";

import { Send, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { askAiAboutText } from "@/app/actions/library-ai";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { AskAiChatMessage } from "@/features/library/ask-ai-validation";
import { LIMITS } from "@/lib/config/limits";
import { resolveActionErrorMessage } from "@/lib/server/server-action-errors";

interface ReaderAskAiDialogProps {
  sourceText: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Chat panel for "Ask AI about the selection". The selected passage is shown as
// pinned context and travels with every request so follow-up questions stay
// grounded; the provider is stateless, so the full thread is resent each turn.
export function ReaderAskAiDialog({
  sourceText,
  open,
  onOpenChange,
}: Readonly<ReaderAskAiDialogProps>) {
  const [messages, setMessages] = useState<AskAiChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const threadEndRef = useRef<HTMLDivElement>(null);

  // Each new selection opens a fresh thread, so a stale conversation never
  // bleeds into a different passage.
  useEffect(() => {
    if (open) {
      setMessages([]);
      setInput("");
    }
  }, [open]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  async function handleAsk() {
    const question = input.trim();
    if (question.length === 0 || isAsking) return;

    const nextMessages: AskAiChatMessage[] = [
      ...messages,
      { role: "user", content: question },
    ];
    setMessages(nextMessages);
    setInput("");
    setIsAsking(true);

    const result = await askAiAboutText({ sourceText, messages: nextMessages });

    setIsAsking(false);

    if (!result.success) {
      toast.error(resolveActionErrorMessage(result));
      setMessages(messages);
      setInput(question);
      return;
    }

    setMessages([
      ...nextMessages,
      { role: "assistant", content: result.answer },
    ]);
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleAsk();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90svh] flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 px-4 pt-5 pb-3 sm:px-6 sm:pt-6">
          <DialogTitle>Ask AI</DialogTitle>
          <DialogDescription>
            Ask questions about the selected passage.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 sm:px-6">
          <blockquote className="mb-4 max-h-32 overflow-y-auto rounded-md border-l-2 border-border bg-muted/50 px-3 py-2 text-muted-foreground text-sm">
            {sourceText}
          </blockquote>

          {messages.length === 0 && !isAsking ? (
            <p className="text-muted-foreground text-sm">
              Type a question below to get started.
            </p>
          ) : null}

          <div className="flex flex-col gap-3">
            {messages.map((message, index) => (
              <ChatBubble key={`${message.role}-${index}`} message={message} />
            ))}
            {isAsking ? (
              <p className="text-muted-foreground text-sm">Thinking…</p>
            ) : null}
            <div ref={threadEndRef} />
          </div>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleAsk();
          }}
          className="flex shrink-0 items-end gap-2 border-t px-4 py-3 sm:px-6"
        >
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleInputKeyDown}
            maxLength={LIMITS.aiAskMessageMax}
            rows={1}
            placeholder="Ask a question…"
            aria-label="Question"
            className="max-h-32 min-h-11 flex-1 resize-none"
          />
          <Button
            type="submit"
            size="icon"
            disabled={isAsking || input.trim().length === 0}
            aria-label="Ask"
            className="size-11 shrink-0"
          >
            {isAsking ? (
              <Sparkles className="size-4 animate-pulse" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ChatBubble({ message }: Readonly<{ message: AskAiChatMessage }>) {
  const isUser = message.role === "user";
  return (
    <div
      className={
        isUser
          ? "ml-auto max-w-[85%] rounded-lg bg-primary px-3 py-2 text-primary-foreground text-sm"
          : "mr-auto max-w-[85%] whitespace-pre-wrap rounded-lg bg-muted px-3 py-2 text-foreground text-sm"
      }
    >
      {message.content}
    </div>
  );
}
