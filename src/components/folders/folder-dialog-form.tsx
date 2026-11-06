"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Controller, type UseFormReturn, useForm } from "react-hook-form";
import { toast } from "sonner";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
  type CreateFolderForm,
  createFolderSchema,
  type EditFolderForm,
  editFolderSchema,
} from "@/features/folders/validation";
import { invalidateFolderViews } from "@/lib/client-cache/invalidation";
import type { ActionErrorResult } from "@/lib/server/server-action-errors";
import { t } from "@/lib/server/server-action-errors";

type FolderFormValues = CreateFolderForm | EditFolderForm;

interface FolderDialogFormProps {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: React.ReactNode;
  values: FolderFormValues;
  /** Overrides the dialog heading, e.g. "Create Subfolder". */
  title?: string;
  onSubmitAction: (
    values: FolderFormValues,
  ) => Promise<{ success: true } | ActionErrorResult>;
  onSuccess?: (values: FolderFormValues) => void;
}

function useFolderForm(
  mode: "create" | "edit",
  values: FolderFormValues,
): UseFormReturn<FolderFormValues> {
  return useForm<FolderFormValues>({
    resolver: zodResolver(
      mode === "create" ? createFolderSchema : editFolderSchema,
    ),
    defaultValues: values,
  });
}

export function FolderDialogForm({
  mode,
  open,
  onOpenChange,
  trigger,
  values,
  title,
  onSubmitAction,
  onSuccess,
}: Readonly<FolderDialogFormProps>) {
  const queryClient = useQueryClient();
  const form = useFolderForm(mode, values);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    form.reset(values);
  }, [form, values]);

  async function onSubmit(data: FolderFormValues) {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await onSubmitAction(data);
      if (result.success) {
        await invalidateFolderViews(queryClient);
        form.reset(mode === "create" ? { name: "" } : data);
        onOpenChange(false);
        onSuccess?.(data);
        return;
      }

      toast.error(t(result.errorCode, result.errorParams));
    } finally {
      setIsSubmitting(false);
    }
  }

  const formId = mode === "create" ? "form-create-folder" : "form-edit-folder";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {title ?? (mode === "create" ? "Create Folder" : "Rename Folder")}
          </DialogTitle>
        </DialogHeader>
        <form id={formId} onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="gap-4">
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`${formId}-name`}>Name</FieldLabel>
                  <Input
                    {...field}
                    id={`${formId}-name`}
                    placeholder="Folder name"
                    aria-invalid={fieldState.invalid}
                    autoFocus
                  />
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />
            <Button
              type="submit"
              form={formId}
              disabled={isSubmitting}
              className="w-full"
            >
              <AsyncButtonContent
                pending={isSubmitting}
                idleLabel={mode === "create" ? "Create Folder" : "Save Changes"}
                pendingLabel={mode === "create" ? "Creating..." : "Saving..."}
              />
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
