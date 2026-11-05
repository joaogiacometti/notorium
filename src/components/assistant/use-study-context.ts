"use client";

import { useEffect, useRef } from "react";
import { useAssistantWorkspace } from "@/components/assistant/assistant-workspace-context";
import type { StudyContext } from "@/features/assistant/study-context";

/** Register live study material, restoring the underlying surface on unmount.
 * Surfaces whose context can narrow to a selection also pass how to drop it.
 * @example useStudyContext(context);
 */
export function useStudyContext(
  context: StudyContext | null,
  clearSelection?: () => void,
): void {
  const workspace = useAssistantWorkspace();
  const registerContext = workspace?.registerContext;
  const latest = useRef(context);
  latest.current = context;
  const latestClear = useRef(clearSelection);
  latestClear.current = clearSelection;
  const enabled = context !== null;
  const label = context ? JSON.stringify(context) : "";
  useEffect(() => {
    if (!enabled || !registerContext) return;
    return registerContext(
      () => latest.current,
      () => latestClear.current?.(),
    );
  }, [enabled, registerContext]);
  const refreshContext = workspace?.refreshContext;
  useEffect(() => {
    if (label) refreshContext?.();
  }, [label, refreshContext]);
}
