"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { AssistantLauncherButton } from "@/components/assistant/assistant-launcher-button";
import { AssistantSurfaceHost } from "@/components/assistant/assistant-surface-host";
import { useAssistantWorkspace } from "@/components/assistant/assistant-workspace-context";
import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface FlashcardEditorDialogContentProps {
  title: string;
  children: ReactNode;
}

const panelClassName =
  "flex max-h-[90svh] w-full max-w-2xl flex-col rounded-lg border bg-background shadow-lg";

/** Keep editor and global chat in one modal focus scope without changing layers.
 * @example <FlashcardEditorDialogContent title="New flashcard">{form}</FlashcardEditorDialogContent>
 */
export function FlashcardEditorDialogContent({
  title,
  children,
}: Readonly<FlashcardEditorDialogContentProps>) {
  const workspace = useAssistantWorkspace();
  const panel = (
    <>
      <FlashcardEditorDialogHeader title={title} />
      {children}
    </>
  );
  if (!workspace)
    return (
      <DialogContent
        showCloseButton={false}
        onOpenAutoFocus={focusDialogContainer}
        className={cn(panelClassName, "gap-0 p-0 sm:max-w-2xl")}
      >
        {panel}
      </DialogContent>
    );
  return (
    <DialogContent
      showCloseButton={false}
      onOpenAutoFocus={focusDialogContainer}
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
      <div className={cn(panelClassName, "pointer-events-auto relative")}>
        {panel}
      </div>
      <AssistantSurfaceHost />
    </DialogContent>
  );
}

function FlashcardEditorDialogHeader({ title }: Readonly<{ title: string }>) {
  return (
    <div className="flex shrink-0 items-center gap-1 px-4 pt-4 pb-3 sm:px-6">
      <DialogTitle className="flex-1 text-base">{title}</DialogTitle>
      <AssistantLauncherButton />
      <DialogClose asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-9"
          aria-label="Close flashcard editor"
        >
          <X className="size-4" />
        </Button>
      </DialogClose>
    </div>
  );
}

/** Radix focuses the first tabbable non-link on open. With the subject picker
 * disabled while subjects load, that was the Front toolbar's Heading 1 button
 * (ring plus tooltip), and only sometimes. Focus the dialog itself so opening is
 * calm and Tab still starts at the first field. */
function focusDialogContainer(event: Event) {
  event.preventDefault();
  if (event.currentTarget instanceof HTMLElement) {
    event.currentTarget.focus();
  }
}
