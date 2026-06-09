"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { editMindmapTitle } from "@/app/actions/mindmaps";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  type EditMindmapTitleForm,
  editMindmapTitleSchema,
} from "@/features/mindmaps/validation";
import { t } from "@/lib/server/server-action-errors";

interface EditMindmapTitleDialogProps {
  mindmap: Pick<EditMindmapTitleForm, "id" | "title">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (newTitle: string) => void;
}

type EditMindmapTitleFormValues = Pick<EditMindmapTitleForm, "title">;

const schema = editMindmapTitleSchema.pick({ title: true });

/**
 * Renders title-only editing for mindmap list actions.
 *
 * @example
 * <EditMindmapTitleDialog mindmap={mindmap} open onOpenChange={setOpen} onSuccess={(newTitle) => ...} />
 */
export function EditMindmapTitleDialog({
  mindmap,
  open,
  onOpenChange,
  onSuccess,
}: Readonly<EditMindmapTitleDialogProps>) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<EditMindmapTitleFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: mindmap.title },
    values: { title: mindmap.title },
  });

  async function handleSubmit(data: EditMindmapTitleFormValues) {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await editMindmapTitle({
        id: mindmap.id,
        title: data.title,
      });

      if (!result.success) {
        toast.error(t(result.errorCode, result.errorParams));
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["search-data"] });
      onOpenChange(false);
      onSuccess(data.title);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      form.reset({ title: mindmap.title });
    }

    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Mindmap</DialogTitle>
          <DialogDescription className="sr-only">
            Update the mindmap title.
          </DialogDescription>
        </DialogHeader>
        <form id="form-edit-mindmap" onSubmit={form.handleSubmit(handleSubmit)}>
          <FieldGroup className="gap-4">
            <Controller
              name="title"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="form-edit-mindmap-title-input">
                    Title
                  </FieldLabel>
                  <Input
                    {...field}
                    id="form-edit-mindmap-title-input"
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
                idleLabel="Save Title"
                pendingLabel="Saving..."
              />
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
