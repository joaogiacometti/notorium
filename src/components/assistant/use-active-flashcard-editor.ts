"use client";

import { useEffect, useRef } from "react";
import {
  type Path,
  type PathValue,
  type UseFormReturn,
  useWatch,
} from "react-hook-form";
import { useAssistantWorkspace } from "@/components/assistant/assistant-workspace-context";
import { createDraftRevisionCounter } from "@/components/assistant/draft-revision";
import type {
  FlashcardDraft,
  FlashcardEditField,
} from "@/features/assistant/edit-contract";
import type { FlashcardFormValues } from "@/features/flashcards/validation";
import type { SubjectOption } from "@/lib/server/api-contracts";

interface ActiveFlashcardEditorOptions<TValues extends FlashcardFormValues> {
  form: UseFormReturn<TValues>;
  enabled: boolean;
  resetVersion?: number | string;
  subjects?: SubjectOption[];
  blocked: boolean;
}

/** Register the live form; snapshots are read at send time, never cached props.
 * @example const review = useActiveFlashcardEditor({ form, enabled: open, blocked: false });
 */
export function useActiveFlashcardEditor<TValues extends FlashcardFormValues>(
  options: ActiveFlashcardEditorOptions<TValues>,
) {
  const workspace = useAssistantWorkspace();
  const recordId = useWatch({
    control: options.form.control,
    name: "id" as Path<TValues>,
  }) as string | undefined;
  const workspaceRef = useRef(workspace);
  const optionsRef = useRef(options);
  const sessionRef = useRef("");
  workspaceRef.current = workspace;
  optionsRef.current = options;
  const hasWorkspace = Boolean(workspace);

  useEffect(() => {
    if (!options.enabled || !hasWorkspace || !workspaceRef.current) return;
    const sessionId = crypto.randomUUID();
    sessionRef.current = sessionId;
    const nextRevision = createDraftRevisionCounter(
      typeof options.resetVersion === "number" ? options.resetVersion : 0,
    );
    const snapshot = (): FlashcardDraft => {
      const current = optionsRef.current;
      const values = current.form.getValues();
      const revision = nextRevision(
        JSON.stringify([
          values.id,
          values.front,
          values.back,
          values.subjectId,
        ]),
      );
      return {
        sessionId,
        revision,
        front: values.front,
        back: values.back,
        subjectPath: current.subjects?.find(
          (subject) => subject.id === values.subjectId,
        )?.path,
      };
    };
    return workspaceRef.current.register({
      sessionId,
      snapshot,
      available: () =>
        !optionsRef.current.blocked &&
        optionsRef.current.form.getValues().id === recordId,
      apply: (field: FlashcardEditField, html: string) =>
        optionsRef.current.form.setValue(
          field as Path<TValues>,
          html as PathValue<TValues, Path<TValues>>,
          { shouldDirty: true, shouldTouch: true, shouldValidate: true },
        ),
    });
  }, [options.enabled, options.resetVersion, hasWorkspace, recordId]);

  const pending =
    workspace?.pending?.sessionId === sessionRef.current
      ? workspace.pending
      : null;
  return { pending, decide: workspace?.decide, blocked: Boolean(pending) };
}
