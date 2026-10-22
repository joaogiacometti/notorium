"use client";

import type { Editor } from "@tiptap/core";
import { closeHistory } from "@tiptap/pm/history";
import { useEffect, useRef } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useAssistantWorkspace } from "@/components/assistant/assistant-workspace-context";
import type { PendingDocumentEdit } from "@/components/assistant/document-editor-types";
import { createDraftRevisionCounter } from "@/components/assistant/draft-revision";
import { buildNoteDraft } from "@/components/assistant/note-edit-content";
import type { EditNoteForm } from "@/features/notes/validation";

interface ActiveNoteEditorOptions {
  editor: Editor | null;
  form: UseFormReturn<EditNoteForm>;
  blocked: boolean;
  subjectPath?: string;
  id: string;
  title: string;
}

/** Register the current note, applying accepted edits as one reversible transaction.
 * @example useActiveNoteEditor({editor, form, blocked: isUploading, id: note.id, title});
 */
export function useActiveNoteEditor(
  options: ActiveNoteEditorOptions,
): PendingDocumentEdit | null {
  const sessionRef = useRef("");
  const workspace = useAssistantWorkspace();
  const current = useRef({ options, workspace });
  current.current = { options, workspace };
  const editor = options.editor;
  const identity = options.id;
  const register = workspace?.documents.register;
  const hasWorkspace = Boolean(register);
  useEffect(() => {
    if (!editor || !hasWorkspace) return;
    const sessionId = crypto.randomUUID();
    sessionRef.current = sessionId;
    const nextRevision = createDraftRevisionCounter();
    return current.current.workspace?.documents.register({
      sessionId,
      available: () =>
        !current.current.options.blocked &&
        current.current.options.id === identity &&
        !editor.isDestroyed,
      snapshot: () => {
        const values = current.current.options.form.getValues();
        const revision = nextRevision(
          JSON.stringify([values.id, values.title, values.content]),
        );
        return {
          kind: "note",
          content: values.content ?? "",
          draft: {
            ...buildNoteDraft(
              sessionId,
              revision,
              values.title,
              values.content ?? "",
              selectedNoteBlocks(editor),
            ),
            subjectPath: current.current.options.subjectPath,
          },
        };
      },
      apply: (change) => {
        if (change.kind !== "note")
          throw new Error(`Invalid edit kind ${change.kind}; expected note`);
        editor.view.dispatch(closeHistory(editor.state.tr));
        editor
          .chain()
          .setContent(change.content)
          .command(({ tr }) => {
            tr.setDocAttribute("documentTitle", change.title);
            return true;
          })
          .run();
        editor.view.dispatch(closeHistory(editor.state.tr));
      },
    });
  }, [editor, identity, hasWorkspace]);
  useNoteTitleHistory(options);
  return workspace?.documents.pending?.baseline.draft.sessionId ===
    sessionRef.current
    ? workspace.documents.pending
    : null;
}

function selectedNoteBlocks(editor: Editor): number[] {
  const selected: number[] = [];
  const { from, to } = editor.state.selection;
  editor.state.doc.forEach((node, offset, index) => {
    if (offset <= to && offset + node.nodeSize > from) selected.push(index);
  });
  return selected;
}

function useNoteTitleHistory({
  editor,
  title,
  form,
}: ActiveNoteEditorOptions): void {
  useEffect(() => {
    if (!editor) return;
    const onTransaction = ({
      transaction,
    }: {
      transaction: import("@tiptap/pm/state").Transaction;
    }) => {
      if (
        transaction.before.attrs.documentTitle ===
        transaction.doc.attrs.documentTitle
      )
        return;
      const next: unknown = transaction.doc.attrs.documentTitle;
      if (typeof next === "string")
        form.setValue("title", next, {
          shouldDirty: true,
          shouldValidate: true,
        });
    };
    editor.on("transaction", onTransaction);
    return () => {
      editor.off("transaction", onTransaction);
    };
  }, [editor, form]);
  useEffect(() => {
    if (!editor || editor.state.doc.attrs.documentTitle === title) return;
    editor.view.dispatch(
      editor.state.tr
        .setDocAttribute("documentTitle", title)
        .setMeta("addToHistory", false),
    );
  }, [editor, title]);
}
