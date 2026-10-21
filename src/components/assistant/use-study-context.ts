"use client";

import { useEffect, useRef } from "react";
import { useAssistantWorkspace } from "@/components/assistant/assistant-workspace-context";
import type { StudyContext } from "@/features/assistant/study-context";

/** Register live study material, restoring the underlying surface on unmount.
 * @example useStudyContext(context);
 */
export function useStudyContext(context: StudyContext | null): void {
  const workspace = useAssistantWorkspace();
  const registerContext = workspace?.registerContext;
  const latest = useRef(context);
  latest.current = context;
  const enabled = context !== null;
  const label = context ? JSON.stringify(context) : "";
  useEffect(() => {
    if (!enabled || !registerContext) return;
    return registerContext(() => latest.current);
  }, [enabled, registerContext]);
  const refreshContext = workspace?.refreshContext;
  useEffect(() => {
    if (label) refreshContext?.();
  }, [label, refreshContext]);
}
