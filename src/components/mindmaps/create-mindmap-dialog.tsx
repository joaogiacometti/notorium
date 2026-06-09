"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { createMindmap } from "@/app/actions/mindmaps";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
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
  type CreateMindmapForm,
  createMindmapSchema,
} from "@/features/mindmaps/validation";
import { t } from "@/lib/server/server-action-errors";

interface CreateMindmapDialogProps {
  subjectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (mindmapId: string) => void;
  trigger?: React.ReactNode;
}

type CreateMindmapTitleForm = Pick<CreateMindmapForm, "title">;

const createMindmapTitleSchema = createMindmapSchema.pick({ title: true });

export function CreateMindmapDialog({
  subjectId,
  open,
  onOpenChange,
  onSuccess,
  trigger,
}: Readonly<CreateMindmapDialogProps>) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<CreateMindmapTitleForm>({
    resolver: zodResolver(createMindmapTitleSchema),
    defaultValues: { title: "" },
  });

  async function handleSubmit(data: CreateMindmapTitleForm) {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createMindmap({ title: data.title, subjectId });

      if (!result.success) {
        toast.error(t(result.errorCode, result.errorParams));
        return;
      }

      form.reset({ title: "" });
      onOpenChange(false);
      onSuccess(result.mindmapId);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      form.reset({ title: "" });
    }

    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Create Mindmap</DialogTitle>
          <DialogDescription className="sr-only">
            Create a mindmap with a title.
          </DialogDescription>
        </DialogHeader>
        <form
          id="form-create-mindmap"
          onSubmit={form.handleSubmit(handleSubmit)}
        >
          <FieldGroup className="gap-4">
            <Controller
              name="title"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="form-create-mindmap-input">
                    Title
                  </FieldLabel>
                  <Input
                    {...field}
                    id="form-create-mindmap-input"
                    placeholder="e.g. Cell Biology Overview"
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
                idleLabel="Create Mindmap"
                pendingLabel="Creating..."
              />
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
