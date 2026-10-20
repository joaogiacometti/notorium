"use client";

import { ArrowUp, Square } from "lucide-react";
import { type KeyboardEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LIMITS } from "@/lib/config/limits";

interface AssistantComposerProps {
  busy: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
}

export function AssistantComposer({
  busy,
  onSend,
  onStop,
}: Readonly<AssistantComposerProps>) {
  const [draft, setDraft] = useState("");
  const canSend = !busy && draft.trim().length > 0;

  function submitDraft() {
    if (!canSend) return;
    onSend(draft.trim());
    setDraft("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    if (event.nativeEvent.isComposing) return;
    event.preventDefault();
    submitDraft();
  }

  return (
    <form
      className="flex items-end gap-2 border-t border-border/60 p-3"
      onSubmit={(event) => {
        event.preventDefault();
        submitDraft();
      }}
    >
      <Textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        maxLength={LIMITS.assistantMessageMaxChars}
        placeholder="Ask a study question…"
        aria-label="Message the study assistant"
        rows={1}
        className="field-sizing-content max-h-32 min-h-9 resize-none"
      />
      {busy ? (
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={onStop}
          aria-label="Stop answer"
        >
          <Square className="size-4" />
        </Button>
      ) : (
        <Button type="submit" size="icon" disabled={!canSend} aria-label="Send">
          <ArrowUp className="size-4" />
        </Button>
      )}
    </form>
  );
}
