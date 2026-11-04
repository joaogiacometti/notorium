"use client";

import { ArrowUp, Square } from "lucide-react";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import {
  AssistantCommandMenu,
  type AssistantCommandMenuIds,
  type AssistantCommandName,
  matchAssistantCommands,
  readBypassRequest,
} from "@/components/assistant/assistant-command-menu";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LIMITS } from "@/lib/config/limits";

interface AssistantComposerProps {
  busy: boolean;
  onSend: (text: string) => Promise<boolean>;
  onStop: () => void;
  onNewChat: () => void;
  chatEmpty?: boolean;
  bypassActive?: boolean;
  onBypass?: () => void;
  value?: string;
  onValueChange?: (value: string) => void;
  focusRequested?: boolean;
}

export function AssistantComposer({
  busy,
  onSend,
  onStop,
  onNewChat,
  chatEmpty = true,
  bypassActive = false,
  onBypass,
  value,
  onValueChange,
  focusRequested = false,
}: Readonly<AssistantComposerProps>) {
  const [localDraft, setLocalDraft] = useState("");
  const draft = value ?? localDraft;
  const setDraft = onValueChange ?? setLocalDraft;
  const [menuDismissed, setMenuDismissed] = useState(false);
  const [menuIds, setMenuIds] = useState<AssistantCommandMenuIds | null>(null);
  const [chosenCommand, setChosenCommand] =
    useState<AssistantCommandName | null>(null);
  const commandText = draft.trim();
  const commands = matchAssistantCommands(draft);
  const menuOpen = !menuDismissed && commands.length > 0;
  const activeCommand =
    chosenCommand && commands.includes(chosenCommand)
      ? chosenCommand
      : commands[0];
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (focusRequested) textareaRef.current?.focus();
  }, [focusRequested]);
  const canSend = !busy && commandText.length > 0;

  function startNewChat(): void {
    onNewChat();
    setDraft("");
    setMenuDismissed(false);
    textareaRef.current?.focus();
  }

  // Turning learning support off costs nothing unless there is a request to
  // carry out: text after the command, or the earlier request a bare `/bypass`
  // refers to. The request stays in the composer if it could not be sent.
  async function runBypass(request: string): Promise<void> {
    if (!request && (chatEmpty || bypassActive || busy)) {
      onBypass?.();
      setDraft("");
      setChosenCommand(null);
      textareaRef.current?.focus();
      return;
    }
    if (busy) return;
    onBypass?.();
    const sent = await onSend(request || "/bypass");
    if (sent !== false) setDraft("");
    setChosenCommand(null);
    textareaRef.current?.focus();
  }

  function runCommand(command: AssistantCommandName): void {
    if (command === "/new") {
      startNewChat();
      return;
    }
    void runBypass("");
  }

  function moveActiveCommand(step: 1 | -1): void {
    const index = activeCommand ? commands.indexOf(activeCommand) : 0;
    const next = commands.at((index + step) % commands.length);
    if (next) setChosenCommand(next);
  }

  async function submitDraft(): Promise<void> {
    if (commandText === "/new") return startNewChat();
    const bypassRequest = readBypassRequest(commandText);
    if (bypassRequest !== null) return runBypass(bypassRequest);
    if (!canSend) return;
    const sent = await onSend(commandText);
    if (sent !== false) setDraft("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.nativeEvent.isComposing) return;
    if (menuOpen && ["Escape", "ArrowDown", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      if (event.key === "Escape") setMenuDismissed(true);
      else moveActiveCommand(event.key === "ArrowDown" ? 1 : -1);
      return;
    }
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    if (menuOpen && activeCommand) {
      event.stopPropagation();
      return runCommand(activeCommand);
    }
    void submitDraft();
  }

  return (
    <form
      className="shrink-0 border-t p-3"
      onSubmit={(event) => {
        event.preventDefault();
        void submitDraft();
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setMenuDismissed(true);
      }}
    >
      {menuOpen && activeCommand ? (
        <AssistantCommandMenu
          commands={commands}
          active={activeCommand}
          onActiveChange={setChosenCommand}
          onIdsChange={setMenuIds}
          onSelect={runCommand}
        />
      ) : null}
      <div className="flex items-end gap-1 rounded-lg border border-input bg-background p-1.5 transition-colors focus-within:border-ring">
        <Textarea
          ref={textareaRef}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setMenuDismissed(false);
          }}
          onFocus={() => setMenuDismissed(false)}
          onKeyDown={handleKeyDown}
          aria-autocomplete="list"
          aria-controls={menuOpen ? menuIds?.list : undefined}
          aria-activedescendant={menuOpen ? menuIds?.option : undefined}
          aria-haspopup="listbox"
          maxLength={LIMITS.assistantMessageMaxChars}
          placeholder="Ask a question…"
          aria-label="Message the assistant"
          rows={1}
          className="field-sizing-content max-h-32 min-h-8 resize-none border-0 bg-transparent px-2 py-1.5 shadow-none focus-visible:ring-0 dark:bg-transparent"
        />
        {busy ? (
          <Button
            type="button"
            size="icon-sm"
            variant="secondary"
            onClick={onStop}
            aria-label="Stop answer"
          >
            <Square className="size-3.5" />
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon-sm"
            disabled={!canSend}
            aria-label="Send"
          >
            <ArrowUp className="size-4" />
          </Button>
        )}
      </div>
    </form>
  );
}
