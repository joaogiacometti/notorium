"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import type {
  ActiveFlashcardEditor,
  PendingFlashcardEdits,
} from "@/components/assistant/assistant-workspace-context";
import { useEditProposalLifecycle } from "@/components/assistant/use-edit-proposal-lifecycle";
import {
  type FlashcardEditField,
  type FlashcardEditsOutput,
  flashcardEditsInputSchema,
  type NativeFlashcardDraft,
} from "@/features/assistant/edit-contract";
import type { AssistantUIMessage } from "@/features/assistant/types";

const EDIT_FIELDS = ["front", "back"] as const;

/** Own card edits independently of chat presentation; each side is accepted separately.
 * @example const flashcards = useFlashcardEditWorkspace(chat);
 */
export function useFlashcardEditWorkspace(
  chat: UseChatHelpers<AssistantUIMessage>,
) {
  const edits = useEditProposalLifecycle<
    NativeFlashcardDraft,
    ActiveFlashcardEditor,
    PendingFlashcardEdits
  >(chat, "proposeFlashcardEdits", {
    skip: async (current) => {
      const output = { ...current.outcomes };
      for (const field of EDIT_FIELDS) {
        if (current.fields[field]) output[field] = "skipped";
      }
      await record(current.toolCallId, output);
    },
    prepare,
    describeError: () => "Expected supported flashcard rich text",
  });

  function record(toolCallId: string, output: FlashcardEditsOutput) {
    return chat.addToolOutput({
      tool: "proposeFlashcardEdits",
      toolCallId,
      output,
    });
  }

  function decide(field: FlashcardEditField, accept: boolean) {
    const current = edits.current();
    const proposal = current?.fields[field];
    const editor = edits.active();
    if (!current || !proposal || !editor?.available()) return;
    const snapshot = editor.snapshot();
    const stale =
      snapshot.sessionId !== current.sessionId ||
      snapshot[field] !== proposal.original;
    if (accept && !stale) editor.apply(field, proposal.replacement);
    const fields = { ...current.fields };
    delete fields[field];
    const outcomes = {
      ...current.outcomes,
      [field]: stale
        ? ("stale" as const)
        : accept
          ? ("accepted" as const)
          : ("discarded" as const),
    };
    edits.replace(
      Object.keys(fields).length ? { ...current, fields, outcomes } : null,
    );
    if (!Object.keys(fields).length) void record(current.toolCallId, outcomes);
  }

  async function prepare(
    toolCallId: string,
    input: unknown,
    isCurrent: () => boolean,
  ): Promise<PendingFlashcardEdits | null> {
    const { restoreDraftReplacement } = await import(
      "@/components/assistant/flashcard-draft-content"
    );
    if (!isCurrent()) return null;
    const baseline = edits.baseline();
    const parsed = flashcardEditsInputSchema.safeParse(input);
    if (!parsed.success) {
      void chat.addToolOutput({
        tool: "proposeFlashcardEdits",
        toolCallId,
        state: "output-error",
        errorText: "Expected valid flashcard field replacements",
      });
      return null;
    }
    const proposal = parsed.data;
    const editor = edits.active();
    const snapshot = editor?.snapshot();
    const stale =
      !baseline ||
      !snapshot ||
      !editor?.available() ||
      proposal.sessionId !== baseline.sessionId ||
      proposal.revision !== baseline.revision ||
      snapshot.sessionId !== baseline.sessionId ||
      snapshot.revision !== baseline.revision;
    if (stale) {
      void record(
        toolCallId,
        Object.fromEntries(
          EDIT_FIELDS.filter((field) => proposal[field] !== undefined).map(
            (field) => [field, "stale"],
          ),
        ),
      );
      edits.setNotice(
        "The draft changed before this suggestion arrived. Ask again to use the current draft.",
      );
      return null;
    }
    const fields: PendingFlashcardEdits["fields"] = {};
    for (const field of EDIT_FIELDS) {
      if (proposal[field] === undefined) continue;
      fields[field] = {
        original: baseline[field],
        replacement: restoreDraftReplacement(proposal[field], baseline[field]),
      };
    }
    return {
      toolCallId,
      sessionId: baseline.sessionId,
      fields,
      outcomes: {},
    };
  }

  return {
    editor: edits.editor,
    active: edits.active,
    register: edits.register,
    capture: edits.capture,
    pending: edits.pending,
    notice: edits.notice,
    settle: edits.settle,
    reset: edits.reset,
    decide,
  };
}
