"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { z } from "zod";
import {
  type ActiveDocumentEditor,
  type DocumentEditControls,
  type DocumentSnapshot,
  documentSnapshotSignature,
  type PendingDocumentEdit,
} from "@/components/assistant/document-editor-types";
import { useEditProposalLifecycle } from "@/components/assistant/use-edit-proposal-lifecycle";
import {
  type DocumentEditOutcome,
  documentDraftSchema,
} from "@/features/assistant/document-edit-contract";
import type { AssistantUIMessage } from "@/features/assistant/types";

/** Own document proposals independently of the page and chat presentation.
 * @example const documents = useDocumentEditWorkspace(chat);
 */
export function useDocumentEditWorkspace(
  chat: UseChatHelpers<AssistantUIMessage>,
  enabled = true,
): DocumentEditControls {
  const edits = useEditProposalLifecycle<
    DocumentSnapshot,
    ActiveDocumentEditor,
    PendingDocumentEdit
  >(chat, "proposeNoteEdits", {
    enabled,
    skip: (current) => record(current.tool, current.toolCallId, "skipped"),
    prepare,
    describeError: describePreparationError,
  });

  async function record(
    tool: PendingDocumentEdit["tool"],
    toolCallId: string,
    outcome: DocumentEditOutcome,
  ): Promise<void> {
    await chat.addToolOutput({ tool, toolCallId, output: { outcome } });
  }
  function capture() {
    const editor = edits.active();
    if (editor && !editor.available())
      throw new Error(
        "Document editor unavailable; expected completed image uploads",
      );
    const snapshot = edits.capture();
    return snapshot ? documentDraftSchema.parse(snapshot.draft) : undefined;
  }
  function decide(accept: boolean): void {
    const current = edits.current();
    if (!current) return;
    if (!accept) {
      edits.replace(null);
      void record(current.tool, current.toolCallId, "discarded");
      return;
    }
    const editor = edits.active();
    if (!editor?.available()) {
      edits.setNotice("Wait for image uploads to finish, then apply again.");
      return;
    }
    const stale =
      documentSnapshotSignature(editor.snapshot()) !==
      documentSnapshotSignature(current.baseline);
    edits.replace(null);
    if (stale) {
      void record(current.tool, current.toolCallId, "stale");
      edits.setNotice(
        "The document changed. Ask again to use the current version.",
      );
      return;
    }
    try {
      editor.apply(current.prepared);
      void record(current.tool, current.toolCallId, "accepted");
    } catch {
      void record(current.tool, current.toolCallId, "stale");
      edits.setNotice(
        "These changes could not be applied. Ask again to retry.",
      );
    }
  }
  async function prepare(
    toolCallId: string,
    input: unknown,
    isCurrent: () => boolean,
  ): Promise<PendingDocumentEdit | null> {
    const { prepareDocumentEdit } = await import(
      "@/components/assistant/prepare-document-edit"
    );
    if (!isCurrent()) return null;
    const captured = edits.baseline();
    const tool = "proposeNoteEdits";
    const editor = edits.active();
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
      void record(tool, toolCallId, "stale");
      edits.setNotice(
        "The document changed before this suggestion arrived. Ask again.",
      );
      return null;
    }
    const prepared = prepareDocumentEdit(captured, input);
    return { tool, toolCallId, baseline: captured, prepared };
  }
  return {
    pending: edits.pending,
    notice: edits.notice,
    register: edits.register,
    capture,
    settle: edits.settle,
    decide,
    reset: edits.reset,
    available: !edits.editor || edits.editor.available(),
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
