"use client";

import { Loader2 } from "lucide-react";
import { useTransition } from "react";
import { deleteMiss } from "@/app/actions/attendance";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DeleteMissDialogProps {
  missId: string;
  missDate: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteMissDialog({
  missId,
  missDate,
  open,
  onOpenChange,
}: Readonly<DeleteMissDialogProps>) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteMiss({ id: missId });
      if (result.success) {
        onOpenChange(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Remove Miss</DialogTitle>
          <DialogDescription>
            {"Are you sure you want to remove the miss recorded for "}
            <span className="font-semibold text-foreground">{missDate}</span>
            {"? This action cannot be undone."}
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
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Remove
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
