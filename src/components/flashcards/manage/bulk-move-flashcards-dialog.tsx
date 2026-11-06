"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { bulkMoveFlashcards } from "@/app/actions/flashcards";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { FolderSelect } from "@/components/shared/folder-select";
import { useCreateInlineFolderPicker } from "@/components/shared/use-create-inline-folder-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import {
  type BulkMoveFlashcardsForm,
  bulkMoveFlashcardsSchema,
} from "@/features/flashcards/validation";
import { invalidateFlashcardViews } from "@/lib/client-cache/invalidation";
import { t } from "@/lib/server/server-action-errors";

interface BulkMoveFlashcardsDialogProps {
  ids: string[];
  open: boolean;
  onMoved: (ids: string[]) => void;
  onOpenChange: (open: boolean) => void;
}

export function BulkMoveFlashcardsDialog({
  ids,
  open,
  onMoved,
  onOpenChange,
}: Readonly<BulkMoveFlashcardsDialogProps>) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const form = useForm<BulkMoveFlashcardsForm>({
    resolver: zodResolver(bulkMoveFlashcardsSchema),
    defaultValues: {
      ids,
      folderId: "",
    },
  });
  const { folders, handleCreateFolder } = useCreateInlineFolderPicker({
    open,
    loadFoldersOnOpen: true,
    onFolderCreated: (createdFolderId) =>
      form.setValue("folderId", createdFolderId, {
        shouldDirty: true,
        shouldValidate: true,
      }),
  });

  useEffect(() => {
    if (open) {
      form.reset({ ids, folderId: "" });
    }
  }, [form, open, ids]);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      form.reset({ ids, folderId: "" });
    }
    onOpenChange(nextOpen);
  }

  function onSubmit(values: BulkMoveFlashcardsForm) {
    startTransition(async () => {
      const result = await bulkMoveFlashcards(values);

      if (result.success) {
        await invalidateFlashcardViews(queryClient);
        onMoved(result.ids);
        onOpenChange(false);
        form.reset({ ids: [], folderId: "" });
        return;
      }

      toast.error(t(result.errorCode, result.errorParams));
    });
  }

  const count = ids.length;
  const descriptionText =
    count === 1
      ? "Move 1 selected flashcard to another folder."
      : `Move ${count} selected flashcards to another folder.`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move Flashcards</DialogTitle>
          <DialogDescription>{descriptionText}</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="gap-4">
            <Controller
              name="folderId"
              control={form.control}
              render={({ field, fieldState }) => (
                <FolderSelect
                  value={field.value ?? null}
                  onChange={field.onChange}
                  folders={folders}
                  id="bulk-move-flashcards-folder"
                  error={fieldState.error?.message as string}
                  ariaInvalid={fieldState.invalid}
                  onCreateFolder={handleCreateFolder}
                />
              )}
            />
            <DialogFooter className="gap-3 sm:gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                <AsyncButtonContent
                  pending={isPending}
                  idleLabel="Move"
                  pendingLabel="Moving..."
                />
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
