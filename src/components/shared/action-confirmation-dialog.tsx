"use client";

import type { ReactNode } from "react";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ConfirmVariant = "default" | "destructive";

interface ActionConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  pendingLabel: string;
  confirmVariant: ConfirmVariant;
  isPending: boolean;
  onConfirm: () => void;
  cancelLabel?: string;
  className?: string;
  confirmDisabled?: boolean;
  confirmIcon?: ReactNode;
  confirmTestId?: string;
  cancelTestId?: string;
  overlayClassName?: string;
  preventEscapeClose?: boolean;
  showCloseButton?: boolean;
}

type ActionConfirmationFooterProps = Pick<
  ActionConfirmationDialogProps,
  | "cancelLabel"
  | "confirmLabel"
  | "pendingLabel"
  | "confirmVariant"
  | "isPending"
  | "onConfirm"
  | "confirmDisabled"
  | "confirmIcon"
  | "confirmTestId"
  | "cancelTestId"
  | "onOpenChange"
>;

/**
 * Renders the shared confirmation shell for action dialogs.
 *
 * @example
 * <ActionConfirmationDialog open={open} onOpenChange={setOpen} title="Delete Note" description="Delete this note?" confirmLabel="Delete" pendingLabel="Deleting..." confirmVariant="destructive" isPending={false} onConfirm={deleteNote} />
 */
export function ActionConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  ...actionProps
}: Readonly<ActionConfirmationDialogProps>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ActionConfirmationContent
        onOpenChange={onOpenChange}
        title={title}
        description={description}
        {...actionProps}
      />
    </Dialog>
  );
}

function ActionConfirmationContent({
  onOpenChange,
  title,
  description,
  className,
  overlayClassName,
  preventEscapeClose = false,
  showCloseButton = true,
  ...footerProps
}: Readonly<
  Omit<ActionConfirmationDialogProps, "open"> & {
    title: string;
    description: ReactNode;
  }
>) {
  return (
    <DialogContent
      className={cn("sm:max-w-md", className)}
      overlayClassName={overlayClassName}
      showCloseButton={showCloseButton}
      onEscapeKeyDown={preventEscapeClose ? preventEscape : undefined}
    >
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <ActionConfirmationFooter onOpenChange={onOpenChange} {...footerProps} />
    </DialogContent>
  );
}

function ActionConfirmationFooter({
  cancelLabel = "Cancel",
  cancelTestId,
  isPending,
  onOpenChange,
  ...confirmProps
}: Readonly<ActionConfirmationFooterProps>) {
  return (
    <DialogFooter className="gap-2 sm:gap-2">
      <Button
        type="button"
        variant="outline"
        data-testid={cancelTestId}
        onClick={() => onOpenChange(false)}
        disabled={isPending}
      >
        {cancelLabel}
      </Button>
      <ActionConfirmButton isPending={isPending} {...confirmProps} />
    </DialogFooter>
  );
}

function ActionConfirmButton({
  confirmLabel,
  pendingLabel,
  confirmVariant,
  isPending,
  onConfirm,
  confirmDisabled = false,
  confirmIcon,
  confirmTestId,
}: Readonly<
  Omit<ActionConfirmationFooterProps, "cancelLabel" | "onOpenChange">
>) {
  return (
    <Button
      type="button"
      variant={confirmVariant}
      data-testid={confirmTestId}
      onClick={onConfirm}
      disabled={isPending || confirmDisabled}
    >
      <AsyncButtonContent
        pending={isPending}
        idleLabel={confirmLabel}
        pendingLabel={pendingLabel}
        idleIcon={confirmIcon}
      />
    </Button>
  );
}

function preventEscape(event: Event) {
  event.preventDefault();
}
