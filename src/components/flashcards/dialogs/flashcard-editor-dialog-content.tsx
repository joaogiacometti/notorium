"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { AssistantSurfaceHost } from "@/components/assistant/assistant-surface-host";
import { useAssistantWorkspace } from "@/components/assistant/assistant-workspace-context";
import { Button } from "@/components/ui/button";
import { DialogClose, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Keep editor and global chat in one modal focus scope without changing layers.
 * @example <FlashcardEditorDialogContent>{form}</FlashcardEditorDialogContent>
 */
export function FlashcardEditorDialogContent({
  children,
}: Readonly<{ children: ReactNode }>) {
  const workspace = useAssistantWorkspace();
  if (!workspace)
    return (
      <DialogContent className="flex max-h-[90svh] flex-col gap-0 p-0 sm:max-w-2xl">
        {children}
      </DialogContent>
    );
  return (
    <DialogContent
      showCloseButton={false}
      onEscapeKeyDown={(event) => {
        if (
          event.target instanceof Element &&
          event.target.closest("[data-study-assistant]")
        ) {
          event.preventDefault();
          workspace.setOpen(false);
        }
      }}
      className={cn(
        "pointer-events-none inset-0 flex h-svh w-screen max-w-none translate-x-0 translate-y-0 items-center justify-center rounded-none border-0 bg-transparent p-4 shadow-none data-[state=open]:animate-none data-[state=closed]:animate-none sm:max-w-none",
        workspace.open && "lg:pr-[25rem]",
      )}
    >
      <DialogClose
        className="absolute inset-0 cursor-default"
        tabIndex={-1}
        aria-hidden="true"
      />
      <div className="pointer-events-auto relative flex max-h-[90svh] w-full max-w-2xl flex-col rounded-lg border bg-background shadow-lg">
        {children}
        <DialogClose asChild>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className="absolute top-3 right-3"
            aria-label="Close flashcard editor"
          >
            <X />
          </Button>
        </DialogClose>
      </div>
      <AssistantSurfaceHost />
    </DialogContent>
  );
}
