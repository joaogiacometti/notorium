"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { put } from "@vercel/blob/client";
import { Plus } from "lucide-react";
import type React from "react";
import { type ChangeEvent, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { generateLibraryUploadToken, uploadBook } from "@/app/actions/library";
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
  isSupportedLibraryBookMime,
  LIBRARY_BOOK_MIME,
} from "@/features/library/constants";
import { createBookSchema } from "@/features/library/validation";
import { LIMITS } from "@/lib/config/limits";
import { t } from "@/lib/server/server-action-errors";

const MAX_BOOK_MB = Math.round(LIMITS.libraryBookMaxBytes / (1024 * 1024));

// Reuse the server schema's title/author rules so the dialog never drifts from
// the validation the Server Action enforces.
const bookMetadataSchema = createBookSchema.pick({ title: true, author: true });
type BookMetadata = z.infer<typeof bookMetadataSchema>;

function validateBookFile(file: File | null): string | null {
  if (!file) {
    return "Select a PDF file to upload.";
  }
  if (!isSupportedLibraryBookMime(file.type)) {
    return "Only PDF files are supported.";
  }
  if (file.size > LIMITS.libraryBookMaxBytes) {
    return `File is too large. Maximum size is ${MAX_BOOK_MB} MB.`;
  }
  return null;
}

function stripPdfExtension(fileName: string): string {
  return fileName.replace(/\.pdf$/i, "");
}

interface AddBookDialogProps {
  /** Pass `null` to suppress the trigger entirely (controlled mode). */
  trigger?: React.ReactNode | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AddBookDialog({
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: Readonly<AddBookDialogProps> = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<BookMetadata>({
    resolver: zodResolver(bookMetadataSchema),
    defaultValues: { title: "", author: "" },
  });

  function resetState() {
    form.reset({ title: "", author: "" });
    setFile(null);
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      resetState();
    }
    if (isControlled) {
      controlledOnOpenChange?.(next);
    } else {
      setInternalOpen(next);
    }
  }

  const defaultTrigger = (
    <Button type="button" className="h-10 gap-1.5">
      <Plus className="size-4" />
      Add book
    </Button>
  );

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setFileError(selected ? validateBookFile(selected) : null);
    if (selected && form.getValues("title").length === 0) {
      // Filenames can exceed the title limit; trim so the autofill is valid.
      form.setValue(
        "title",
        stripPdfExtension(selected.name).slice(0, LIMITS.libraryBookTitleMax),
      );
    }
  }

  async function onSubmit(values: BookMetadata) {
    const error = validateBookFile(file);
    if (error || !file) {
      setFileError(error);
      return;
    }
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      await uploadSelectedBook(values, file);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function uploadSelectedBook(values: BookMetadata, selected: File) {
    const tokenResult = await generateLibraryUploadToken({
      fileName: selected.name,
      mimeType: selected.type || LIBRARY_BOOK_MIME,
    });

    if (!tokenResult.success) {
      toast.error(t(tokenResult.error));
      return;
    }

    const blob = await put(tokenResult.pathname, selected, {
      access: "private",
      contentType: selected.type || LIBRARY_BOOK_MIME,
      token: tokenResult.token,
    });

    const result = await uploadBook({
      title: values.title,
      author: values.author,
      fileName: selected.name,
      mimeType: selected.type || LIBRARY_BOOK_MIME,
      blobPathname: blob.pathname,
      sizeBytes: selected.size,
    });

    if (result.success) {
      handleOpenChange(false);
      return;
    }

    toast.error(t(result.errorCode, result.errorParams));
  }

  const resolvedTrigger = trigger === undefined ? defaultTrigger : trigger;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {resolvedTrigger !== null ? (
        <DialogTrigger asChild>{resolvedTrigger}</DialogTrigger>
      ) : null}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Book</DialogTitle>
        </DialogHeader>
        <form id="form-add-book" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="gap-4">
            <Field data-invalid={Boolean(fileError)}>
              <FieldLabel htmlFor="form-add-book-file">PDF file</FieldLabel>
              <Input
                id="form-add-book-file"
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                aria-invalid={Boolean(fileError)}
                onChange={handleFileChange}
              />
              {fileError ? (
                <FieldError errors={[{ message: fileError }]} />
              ) : null}
            </Field>

            <Controller
              name="title"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="form-add-book-title">Title</FieldLabel>
                  <Input
                    {...field}
                    id="form-add-book-title"
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
                  <FieldLabel htmlFor="form-add-book-author">
                    Author (optional)
                  </FieldLabel>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    id="form-add-book-author"
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
              form="form-add-book"
              disabled={isSubmitting}
              className="w-full"
            >
              <AsyncButtonContent
                pending={isSubmitting}
                idleLabel="Add Book"
                pendingLabel="Uploading..."
              />
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
