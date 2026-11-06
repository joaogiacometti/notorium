"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { createNote } from "@/app/actions/notes";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { FolderSelect } from "@/components/shared/folder-select";
import { useCreateInlineFolderPicker } from "@/components/shared/use-create-inline-folder-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  type CreateNoteForm,
  createNoteSchema,
} from "@/features/notes/validation";
import { invalidateDocumentViews } from "@/lib/client-cache/invalidation";
import { emptyDocument } from "@/lib/editor/document";
import type { FolderOption } from "@/lib/server/api-contracts";
import { t } from "@/lib/server/server-action-errors";

interface CreateNoteTitleDialogProps {
  folderId?: string;
  folders?: FolderOption[];
  trigger?: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (noteId: string, folderId: string) => void;
}

export function CreateNoteTitleDialog({
  folderId,
  folders: initialFolders,
  trigger,
  open,
  onOpenChange,
  onSuccess,
}: Readonly<CreateNoteTitleDialogProps>) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<CreateNoteForm>({
    resolver: zodResolver(createNoteSchema),
    defaultValues: {
      folderId: folderId ?? "",
      title: "",
      content: emptyDocument(),
    },
  });
  const { folders, handleCreateFolder } = useCreateInlineFolderPicker({
    initialFolders,
    open,
    onFolderCreated: (createdFolderId) =>
      form.setValue("folderId", createdFolderId, {
        shouldDirty: true,
        shouldValidate: true,
      }),
  });

  useEffect(() => {
    if (open) {
      form.reset({
        folderId: folderId ?? "",
        title: "",
        content: emptyDocument(),
      });
    }
  }, [form, open, folderId]);

  async function handleSubmit(data: CreateNoteForm) {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createNote({
        folderId: data.folderId,
        title: data.title,
        content: emptyDocument(),
      });

      if (!result.success) {
        toast.error(t(result.errorCode, result.errorParams));
        return;
      }

      await invalidateDocumentViews(queryClient, [result.folderId]);
      form.reset({
        folderId: folderId ?? "",
        title: "",
        content: emptyDocument(),
      });
      onOpenChange(false);
      onSuccess(result.noteId, data.folderId);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      form.reset({
        folderId: folderId ?? "",
        title: "",
        content: emptyDocument(),
      });
    }

    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Create Note</DialogTitle>
          <DialogDescription className="sr-only">
            Create a note with a title.
          </DialogDescription>
        </DialogHeader>
        <form
          id="form-create-note-title"
          onSubmit={form.handleSubmit(handleSubmit)}
        >
          <FieldGroup className="gap-4">
            {initialFolders ? (
              <Controller
                name="folderId"
                control={form.control}
                render={({ field, fieldState }) => (
                  <FolderSelect
                    value={field.value}
                    onChange={(value) => field.onChange(value ?? "")}
                    folders={folders}
                    id="form-create-note-folder"
                    error={fieldState.error?.message}
                    ariaInvalid={fieldState.invalid}
                    onCreateFolder={handleCreateFolder}
                  />
                )}
              />
            ) : null}
            <Controller
              name="title"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="form-create-note-title-input">
                    Title
                  </FieldLabel>
                  <Input
                    {...field}
                    id="form-create-note-title-input"
                    placeholder="e.g. Chapter 3 Summary"
                    aria-invalid={fieldState.invalid}
                    autoFocus
                  />
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />
            <Button type="submit" disabled={isSubmitting} className="w-full">
              <AsyncButtonContent
                pending={isSubmitting}
                idleLabel="Create Note"
                pendingLabel="Creating..."
              />
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
