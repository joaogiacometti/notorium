"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { deleteMiss } from "@/app/actions/attendance";
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
import { resolveActionErrorMessage } from "@/lib/server/server-action-errors";

interface DeleteMissDialogProps {
  missId: string;
  missDate: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: (id: string) => void;
}

export function DeleteMissDialog({
  missId,
  missDate,
  open,
  onOpenChange,
  onDeleted,
}: Readonly<DeleteMissDialogProps>) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteMiss({ id: missId });
      if (result.success) {
        onDeleted?.(missId);
        onOpenChange(false);
      } else {
        toast.error(resolveActionErrorMessage(result));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Remove Miss</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove the miss recorded for{" "}
            <span className="font-semibold text-foreground">{missDate}</span>?
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            <AsyncButtonContent
              pending={isPending}
              idleLabel="Remove"
              pendingLabel="Deleting..."
            />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
