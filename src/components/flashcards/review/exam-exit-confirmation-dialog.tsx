"use client";

import { ActionConfirmationDialog } from "@/components/shared/action-confirmation-dialog";

interface ExamExitConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

/**
 * Renders the destructive confirmation used before leaving an active exam.
 *
 * @example
 * <ExamExitConfirmationDialog open={open} onOpenChange={setOpen} onConfirm={exitExam} />
 */
export function ExamExitConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
}: Readonly<ExamExitConfirmationDialogProps>) {
  return (
    <ActionConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Exit Exam"
      description="Are you sure you want to exit? Your progress won't be saved."
      confirmLabel="Exit"
      pendingLabel="Exiting..."
      confirmVariant="destructive"
      isPending={false}
      onConfirm={onConfirm}
      className="z-120"
      overlayClassName="z-120"
      preventEscapeClose
    />
  );
}
