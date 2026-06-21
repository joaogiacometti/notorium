"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { updateBook } from "@/app/actions/library";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { updateBookSchema } from "@/features/library/validation";
import { LIMITS } from "@/lib/config/limits";
import { t } from "@/lib/server/server-action-errors";

// Reuse the server schema's title/author rules so the dialog never drifts from
// the validation the Server Action enforces.
const bookMetadataSchema = updateBookSchema.pick({ title: true, author: true });
type BookMetadata = z.infer<typeof bookMetadataSchema>;

interface EditBookDialogBook {
  id: string;
  title: string;
  author: string | null;
}

interface EditBookDialogProps {
  book: EditBookDialogBook;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful save so callers can refresh their own state. */
  onSaved?: () => void;
}

export function EditBookDialog({
  book,
  open,
  onOpenChange,
  onSaved,
}: Readonly<EditBookDialogProps>) {
  const form = useForm<BookMetadata>({
    resolver: zodResolver(bookMetadataSchema),
    defaultValues: { title: book.title, author: book.author ?? "" },
  });

  useEffect(() => {
    form.reset({ title: book.title, author: book.author ?? "" });
  }, [book, form]);

  async function onSubmit(values: BookMetadata) {
    const result = await updateBook({
      bookId: book.id,
      title: values.title,
      author: values.author,
    });

    if (result.success) {
      onOpenChange(false);
      onSaved?.();
      return;
    }

    toast.error(t(result.errorCode, result.errorParams));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Book</DialogTitle>
        </DialogHeader>
        <form id="form-edit-book" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="gap-4">
            <Controller
              name="title"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="form-edit-book-title">Title</FieldLabel>
                  <Input
                    {...field}
                    id="form-edit-book-title"
                    placeholder="e.g. The Pragmatic Programmer"
                    maxLength={LIMITS.libraryBookTitleMax}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />

            <Controller
              name="author"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="form-edit-book-author">
                    Author (optional)
                  </FieldLabel>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    id="form-edit-book-author"
                    placeholder="e.g. Hunt & Thomas"
                    maxLength={LIMITS.libraryBookAuthorMax}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />

            <Button
              type="submit"
              form="form-edit-book"
              disabled={form.formState.isSubmitting}
              className="w-full"
            >
              <AsyncButtonContent
                pending={form.formState.isSubmitting}
                idleLabel="Save Changes"
                pendingLabel="Saving..."
              />
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
