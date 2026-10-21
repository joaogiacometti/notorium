"use client";

import type { ReactNode } from "react";
import { useAssistantWorkspace } from "@/components/assistant/assistant-workspace-context";
import { cn } from "@/lib/utils";

/** Reserve desktop space for the one global assistant, including detail pages.
 * @example <AssistantAppFrame>{app}</AssistantAppFrame>
 */
export function AssistantAppFrame({
  children,
}: Readonly<{ children: ReactNode }>) {
  const workspace = useAssistantWorkspace();
  return (
    <div className={cn("min-h-svh", workspace?.open && "lg:pr-96")}>
      {children}
    </div>
  );
}
