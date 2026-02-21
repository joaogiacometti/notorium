"use client";

import { Loader2 } from "lucide-react";
import { useTransition } from "react";
import { deleteGrade } from "@/app/actions/grades";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DeleteGradeDialogProps {
  gradeId: string;
  gradeName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteGradeDialog({
  gradeId,
  gradeName,
  open,
  onOpenChange,
}: Readonly<DeleteGradeDialogProps>) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteGrade({ id: gradeId });
      if (result.success) {
        onOpenChange(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Grade</DialogTitle>
          <DialogDescription>
            {"Are you sure you want to delete "}
            <span className="font-semibold text-foreground">{gradeName}</span>
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
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
