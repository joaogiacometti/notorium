"use client";

import { Minus, RotateCcw, SquarePen } from "lucide-react";
import { readAssistantErrorMessage } from "@/components/assistant/assistant-chat-transport";
import { AssistantComposer } from "@/components/assistant/assistant-composer";
import { AssistantMessageList } from "@/components/assistant/assistant-message-list";
import { AssistantPanelFrame } from "@/components/assistant/assistant-panel-frame";
import {
  type AssistantWorkspace,
  useAssistantWorkspace,
} from "@/components/assistant/assistant-workspace-context";
import { Button } from "@/components/ui/button";
import { describeStudyContext } from "@/features/assistant/study-context";
import { isAssistantReplyInFlight } from "@/features/assistant/utils";

interface AssistantPanelProps {
  /** Hides the panel; the launcher keeps it mounted, so the chat survives. */
  onMinimize: () => void;
  embedded?: boolean;
}

/**
 * Chat panel backed by the shared workspace. The conversation is
 * never saved, and "New chat" clears it. Minimize (or the floating launcher)
 * hides the panel without clearing it. Flashcard outcomes are recorded on
 * their tool call without sending a turn, so they reach the model with the
 * user's next message instead of spending an assistant reply.
 *
 * @example
 * <AssistantPanel onMinimize={() => setOpen(false)} />
 */
export function AssistantPanel(props: Readonly<AssistantPanelProps>) {
  const workspace = useAssistantWorkspace();
  return workspace ? (
    <AssistantConversationPanel {...props} workspace={workspace} />
  ) : null;
}

interface AssistantConversationPanelProps extends AssistantPanelProps {
  workspace: AssistantWorkspace;
}

function AssistantConversationPanel({
  workspace,
  embedded,
  onMinimize,
}: Readonly<AssistantConversationPanelProps>) {
  const { chat, proposals } = workspace;
  const busy = isAssistantReplyInFlight(chat.status);
  return (
    <AssistantPanelFrame
      embedded={embedded}
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
            onClick={workspace.reset}
            disabled={chat.messages.length === 0}
            aria-label="New chat"
          >
            <SquarePen className="size-4" />
          </Button>
        </div>
      }
    >
      {workspace.editor ? (
        <p className="border-b px-4 py-2 text-xs text-muted-foreground">
          Using current flashcard draft
        </p>
      ) : null}
      {!workspace.editor && workspace.context ? (
        <p className="border-b px-4 py-2 text-xs text-muted-foreground">
          {describeStudyContext(workspace.context)}
        </p>
      ) : null}
      {workspace.notice ? (
        <p role="status" className="px-4 py-2 text-xs text-muted-foreground">
          {workspace.notice}
        </p>
      ) : null}
      {workspace.pending ? (
        <p role="status" className="px-4 py-2 text-xs text-muted-foreground">
          Review suggested changes in the editor.
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="lg:hidden"
            onClick={onMinimize}
          >
            Back to editor
          </Button>
        </p>
      ) : null}
      <AssistantMessageList
        messages={chat.messages}
        status={chat.status}
        proposals={proposals}
        onOpenLibraryHit={() => minimizeOnCompactLayout(onMinimize)}
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
            onClick={() => void workspace.send()}
          >
            <RotateCcw />
            Retry
          </Button>
        </div>
      ) : null}
      <AssistantComposer
        busy={busy}
        value={workspace.composerDraft}
        onValueChange={workspace.setComposerDraft}
        onSend={(text) => workspace.send(text)}
        focusRequested={workspace.open}
        onStop={() => void chat.stop()}
      />
    </AssistantPanelFrame>
  );
}

// Below `lg` the chat covers the page, so an opened search result would load
// hidden behind it; wider layouts keep the chat beside the page.
function minimizeOnCompactLayout(onMinimize: () => void): void {
  if (!window.matchMedia("(min-width: 64rem)").matches) onMinimize();
}
