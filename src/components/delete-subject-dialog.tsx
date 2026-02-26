"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { deleteSubject } from "@/app/actions/subjects";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DeleteSubjectDialogProps {
  subjectId: string;
  subjectName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DeleteSubjectDialog({
  subjectId,
  subjectName,
  open,
  onOpenChange,
  onSuccess,
}: Readonly<DeleteSubjectDialogProps>) {
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteSubject({ id: subjectId });
      if (result.success) {
        await queryClient.invalidateQueries({ queryKey: ["search-data"] });
        if (onSuccess) {
          onSuccess();
        } else {
          onOpenChange(false);
        }
      } else if (result.error) {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Subject</DialogTitle>
          <DialogDescription>
            {"Are you sure you want to delete "}
            <span className="font-semibold text-foreground">{subjectName}</span>
            {
              "? This action cannot be undone. All associated notes will also be deleted."
            }
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
