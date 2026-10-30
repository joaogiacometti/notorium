"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
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
import { type ActionErrorResult, t } from "@/lib/server/server-action-errors";

interface DocumentTitleForm {
  title: string;
}

interface RenameDocumentDialogProps {
  /** Singular kind name shown in the dialog, such as "Note" or "PDF". */
  kindLabel: string;
  title: string;
  titleSchema: z.ZodType<DocumentTitleForm, DocumentTitleForm>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRename: (title: string) => Promise<{ success: true } | ActionErrorResult>;
  onSuccess: () => void;
}

/**
 * Title-only rename dialog shared by every document kind.
 *
 * @example
 * <RenameDocumentDialog kindLabel="PDF" title={pdf.title} titleSchema={pdfTitleFormSchema} open onOpenChange={setOpen} onRename={(title) => renamePdf({ id, title })} onSuccess={refresh} />
 */
export function RenameDocumentDialog({
  kindLabel,
  title,
  titleSchema,
  open,
  onOpenChange,
  onRename,
  onSuccess,
}: Readonly<RenameDocumentDialogProps>) {
  const inputId = useId();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<DocumentTitleForm>({
    resolver: zodResolver(titleSchema),
    defaultValues: { title },
    values: { title },
  });

  async function handleSubmit(values: DocumentTitleForm) {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onRename(values.title);
      if (!result.success) {
        toast.error(t(result.errorCode, result.errorParams));
        return;
      }
      onOpenChange(false);
      onSuccess();
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      form.reset({ title });
    }
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Rename {kindLabel}</DialogTitle>
          <DialogDescription className="sr-only">
            Update the {kindLabel.toLowerCase()} title.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <FieldGroup className="gap-4">
            <Controller
              name="title"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={inputId}>Title</FieldLabel>
                  <Input
                    {...field}
                    id={inputId}
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
