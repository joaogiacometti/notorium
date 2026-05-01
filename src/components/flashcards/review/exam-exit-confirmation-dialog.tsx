"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="z-120 sm:max-w-md"
        overlayClassName="z-120"
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Exit Exam</DialogTitle>
          <DialogDescription>
            Are you sure you want to exit? Your progress won&apos;t be saved.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Exit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
