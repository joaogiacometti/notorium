"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { AssistantUIMessage } from "@/features/assistant/types";
import { isAssistantReplyInFlight } from "@/features/assistant/utils";

interface ProposalEditor<Snapshot> {
  snapshot: () => Snapshot;
  available: () => boolean;
}

interface ProposalLifecycleOptions<Pending> {
  enabled?: boolean;
  skip: (pending: Pending) => Promise<void>;
  prepare: (
    toolCallId: string,
    input: unknown,
    isCurrent: () => boolean,
  ) => Promise<Pending | null>;
  describeError: (error: unknown) => string;
}

/** Share session ownership and asynchronous delivery, while each editor owns
 * validation, acceptance, and its tool's outcome format.
 * @example const edits = useEditProposalLifecycle(chat, "proposeNoteEdits", options);
 */
export function useEditProposalLifecycle<
  Snapshot,
  Editor extends ProposalEditor<Snapshot>,
  Pending,
>(
  chat: UseChatHelpers<AssistantUIMessage>,
  tool: "proposeNoteEdits" | "proposeFlashcardEdits",
  {
    enabled = true,
    skip,
    prepare,
    describeError,
  }: ProposalLifecycleOptions<Pending>,
) {
  const editors = useRef<Editor[]>([]);
  const [editor, setEditor] = useState<Editor | null>(null);
  const enabledRef = useRef(enabled);
  // Suspended renders must not change the editor used by the committed UI.
  useLayoutEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);
  const baseline = useRef<Snapshot | null>(null);
  // Event handlers and consecutive tool calls must see changes before a render.
  const pendingRef = useRef<Pending | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const generation = useRef(0);
  const handled = useRef(new Set<string>());
  const receiveQueue = useRef(Promise.resolve());

  function active() {
    return enabledRef.current ? (editors.current.at(-1) ?? null) : null;
  }
  function replace(next: Pending | null) {
    pendingRef.current = next;
    setPending(next);
  }
  async function settle(): Promise<void> {
    const current = pendingRef.current;
    replace(null);
    if (current) await skip(current);
  }
  function leaveEditor() {
    baseline.current = null;
    void settle();
  }
  function register(next: Editor) {
    leaveEditor();
    editors.current.push(next);
    setEditor(next);
    setNotice(null);
    return () => {
      const wasActive = editors.current.at(-1) === next;
      editors.current = editors.current.filter((entry) => entry !== next);
      if (wasActive) {
        leaveEditor();
        setEditor(editors.current.at(-1) ?? null);
      }
    };
  }
  function capture(snapshot = active()?.snapshot() ?? null) {
    generation.current += 1;
    baseline.current = snapshot;
    setNotice(null);
    return baseline.current;
  }
  function reset() {
    generation.current += 1;
    baseline.current = null;
    handled.current.clear();
    replace(null);
    setNotice(null);
  }

  useEffect(() => {
    if (isAssistantReplyInFlight(chat.status)) return;
    for (const message of chat.messages)
      for (const part of message.parts) {
        if (
          (part.type !== "tool-proposeNoteEdits" &&
            part.type !== "tool-proposeFlashcardEdits") ||
          part.type !== `tool-${tool}` ||
          part.state !== "input-available" ||
          handled.current.has(part.toolCallId)
        )
          continue;
        handled.current.add(part.toolCallId);
        const requestGeneration = generation.current;
        const isCurrent = () => requestGeneration === generation.current;
        receiveQueue.current = receiveQueue.current
          .then(async () => {
            if (!isCurrent()) return;
            const captured = baseline.current;
            const next = await prepare(part.toolCallId, part.input, isCurrent);
            if (!next || !isCurrent()) return;
            await settle();
            if (isCurrent() && captured === baseline.current) replace(next);
          })
          .catch((error: unknown) => {
            if (!isCurrent()) return;
            void chat.addToolOutput({
              tool,
              toolCallId: part.toolCallId,
              state: "output-error",
              errorText: describeError(error),
            });
            setNotice(
              "These changes could not be prepared. Ask again to retry.",
            );
          });
      }
  });
  const onDisabled = useEffectEvent(leaveEditor);
  useEffect(() => {
    if (!enabled) onDisabled();
  }, [enabled]);
  useEffect(
    () => () => {
      generation.current += 1;
      baseline.current = null;
    },
    [],
  );

  return {
    editor: enabled ? editor : null,
    active,
    register,
    capture,
    baseline: () => baseline.current,
    pending,
    current: () => pendingRef.current,
    replace,
    settle,
    reset,
    notice,
    setNotice,
  };
}
