"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import {
  type ActiveDocumentEditor,
  type DocumentEditControls,
  type DocumentSnapshot,
  documentSnapshotSignature,
  type PendingDocumentEdit,
} from "@/components/assistant/document-editor-types";
import {
  type DocumentEditOutcome,
  documentDraftSchema,
} from "@/features/assistant/document-edit-contract";
import type { AssistantUIMessage } from "@/features/assistant/types";
import { isAssistantReplyInFlight } from "@/features/assistant/utils";

/** Own document proposals independently of the page and chat presentation.
 * @example const documents = useDocumentEditWorkspace(chat);
 */
export function useDocumentEditWorkspace(
  chat: UseChatHelpers<AssistantUIMessage>,
  enabled = true,
): DocumentEditControls {
  const editors = useRef<ActiveDocumentEditor[]>([]);
  const baseline = useRef<DocumentSnapshot | null>(null);
  const pendingRef = useRef<PendingDocumentEdit | null>(null);
  const [pending, setPending] = useState<PendingDocumentEdit | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const handled = useRef(new Set<string>());
  const generation = useRef(0);
  const active = () => (enabled ? editors.current.at(-1) : undefined);
  const receiveQueue = useRef(Promise.resolve());

  async function record(
    tool: PendingDocumentEdit["tool"],
    toolCallId: string,
    outcome: DocumentEditOutcome,
  ): Promise<void> {
    await chat.addToolOutput({ tool, toolCallId, output: { outcome } });
  }
  function clearPending(): void {
    pendingRef.current = null;
    setPending(null);
  }
  async function settle(): Promise<void> {
    const current = pendingRef.current;
    clearPending();
    if (current) await record(current.tool, current.toolCallId, "skipped");
  }
  function register(editor: ActiveDocumentEditor): () => void {
    void settle();
    editors.current.push(editor);
    return () => {
      if (active() === editor) {
        void settle();
        baseline.current = null;
        generation.current += 1;
      }
      editors.current = editors.current.filter(
        (candidate) => candidate !== editor,
      );
    };
  }
  function capture() {
    generation.current += 1;
    const editor = active();
    if (editor && !editor.available())
      throw new Error(
        "Document editor unavailable; expected completed image uploads",
      );
    baseline.current = editor?.snapshot() ?? null;
    setNotice(null);
    return baseline.current
      ? documentDraftSchema.parse(baseline.current.draft)
      : undefined;
  }
  function decide(accept: boolean): void {
    const current = pendingRef.current;
    if (!current) return;
    if (!accept) {
      clearPending();
      void record(current.tool, current.toolCallId, "discarded");
      return;
    }
    const editor = active();
    if (!editor?.available()) {
      setNotice("Wait for image uploads to finish, then apply again.");
      return;
    }
    const stale =
      documentSnapshotSignature(editor.snapshot()) !==
      documentSnapshotSignature(current.baseline);
    clearPending();
    if (stale) {
      void record(current.tool, current.toolCallId, "stale");
      setNotice("The document changed. Ask again to use the current version.");
      return;
    }
    try {
      editor.apply(current.prepared);
      void record(current.tool, current.toolCallId, "accepted");
    } catch {
      void record(current.tool, current.toolCallId, "stale");
      setNotice("These changes could not be applied. Ask again to retry.");
    }
  }
  async function receive(
    tool: PendingDocumentEdit["tool"],
    toolCallId: string,
    input: unknown,
    captured: DocumentSnapshot | null,
    requestGeneration: number,
  ): Promise<void> {
    if (requestGeneration !== generation.current) return;
    const { prepareDocumentEdit } = await import(
      "@/components/assistant/prepare-document-edit"
    );
    if (requestGeneration !== generation.current) return;
    const editor = active();
    const identity = input as {
      sessionId?: unknown;
      revision?: unknown;
    } | null;
    const stale =
      !captured ||
      !editor?.available() ||
      !identity ||
      identity.sessionId !== captured.draft.sessionId ||
      identity.revision !== captured.draft.revision ||
      documentSnapshotSignature(editor.snapshot()) !==
        documentSnapshotSignature(captured);
    if (stale) {
      await record(tool, toolCallId, "stale");
      setNotice(
        "The document changed before this suggestion arrived. Ask again.",
      );
      return;
    }
    const prepared = prepareDocumentEdit(captured, input);
    await settle();
    if (requestGeneration !== generation.current) return;
    const next = { tool, toolCallId, baseline: captured, prepared };
    pendingRef.current = next;
    setPending(next);
  }
  useEffect(() => {
    if (isAssistantReplyInFlight(chat.status)) return;
    for (const message of chat.messages)
      for (const part of message.parts) {
        if (
          part.type !== "tool-proposeNoteEdits" ||
          part.state !== "input-available" ||
          handled.current.has(part.toolCallId)
        )
          continue;
        handled.current.add(part.toolCallId);
        const tool = "proposeNoteEdits";
        const captured = baseline.current;
        const requestGeneration = generation.current;
        receiveQueue.current = receiveQueue.current
          .then(() =>
            receive(
              tool,
              part.toolCallId,
              part.input,
              captured,
              requestGeneration,
            ),
          )
          .catch((error: unknown) => {
            if (requestGeneration !== generation.current) return;
            void chat.addToolOutput({
              tool,
              toolCallId: part.toolCallId,
              state: "output-error",
              errorText: describePreparationError(error),
            });
            setNotice(
              "These changes could not be prepared. Ask again to retry.",
            );
          });
      }
  });
  const controlsRef = useRef({ settle });
  controlsRef.current = { settle };
  useEffect(() => {
    if (!enabled) {
      generation.current += 1;
      baseline.current = null;
      void controlsRef.current.settle();
    }
  }, [enabled]);
  function reset(): void {
    generation.current += 1;
    baseline.current = null;
    handled.current.clear();
    clearPending();
    setNotice(null);
  }
  return {
    pending,
    notice,
    register,
    capture,
    settle,
    decide,
    reset,
    available: !active() || Boolean(active()?.available()),
  };
}

// Preparation errors are our own validation messages (ids and expected shapes),
// so the model can correct its next proposal; anything else stays generic.
function describePreparationError(error: unknown): string {
  if (error instanceof z.ZodError)
    return `Expected valid document edits: ${z.prettifyError(error)}`;
  // Our edit validators all phrase failures as "<problem>; expected <shape>".
  if (error instanceof Error && error.message.includes("; expected "))
    return error.message;
  return "Expected valid document edits";
}
