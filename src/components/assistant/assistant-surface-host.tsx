"use client";

import { useEffectEvent, useLayoutEffect, useRef } from "react";
import { useAssistantWorkspace } from "@/components/assistant/assistant-workspace-context";

/** Portal the global assistant inside the currently active focus/scroll boundary.
 * @example <AssistantSurfaceHost />
 */
export function AssistantSurfaceHost() {
  const workspace = useAssistantWorkspace();
  const elementRef = useRef<HTMLDivElement>(null);
  const attach = useEffectEvent((host: HTMLElement) =>
    workspace?.registerHost(host),
  );
  useLayoutEffect(() => {
    if (elementRef.current) return attach(elementRef.current);
  }, []);
  return (
    <div
      ref={elementRef}
      className="pointer-events-none fixed inset-0 z-overlay"
    />
  );
}
