import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AssistantPanelFrameProps {
  /** Header buttons, right-aligned next to the title. */
  actions?: ReactNode;
  children: ReactNode;
  busy?: boolean;
  embedded?: boolean;
}

/**
 * Outer surface of the study assistant panel. Kept free of the chat runtime
 * so the launcher can show it the instant it opens, before the lazily loaded
 * chat arrives.
 *
 * @example
 * <AssistantPanelFrame actions={<NewChatButton />}>{body}</AssistantPanelFrame>
 */
export function AssistantPanelFrame({
  actions,
  children,
  busy = false,
  embedded = false,
}: Readonly<AssistantPanelFrameProps>) {
  return (
    <section
      aria-label="Study assistant"
      aria-busy={busy}
      className={cn(
        "flex min-h-0 flex-col overflow-hidden bg-card",
        embedded
          ? "h-full w-full"
          : "h-[min(36rem,calc(100svh-6rem))] w-[calc(100vw-2rem)] rounded-lg border shadow-lg sm:w-96",
      )}
    >
      <header className="flex h-14 shrink-0 items-center gap-1 border-b pr-3 pl-4">
        <h2 className="flex-1 text-sm font-semibold">Study assistant</h2>
        {actions}
      </header>
      {children}
    </section>
  );
}
