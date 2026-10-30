"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { type ChangeEvent, useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { SubjectSelect } from "@/components/shared/subject-select";
import { useCreateInlineSubjectPicker } from "@/components/shared/use-create-inline-subject-picker";
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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getPdfFileProblem, pdfTitleFromFileName } from "@/features/pdfs/utils";
import {
  type CreatePdfFormValues,
  createPdfFormSchema,
  PDF_MIME_TYPE,
} from "@/features/pdfs/validation";
import { uploadPdfDocument } from "@/lib/attachments/upload-pdf-document";
import { LIMITS } from "@/lib/config/limits";
import type { SubjectOption } from "@/lib/server/api-contracts";
import { t } from "@/lib/server/server-action-errors";
import { notifySubjectDocumentsChanged } from "@/lib/trees/subject-documents-events";
import { validationMessage } from "@/lib/validations/validation-messages";

interface CreatePdfDialogProps {
  subjectId?: string;
  /** When set, the dialog shows a subject picker preselected to `subjectId`. */
  subjects?: SubjectOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (pdfId: string, subjectId: string) => void;
}

/**
 * Picks a PDF, uploads it straight to media storage with progress, and adds it
 * to the subject as a document.
 *
 * @example
 * <CreatePdfDialog subjectId={id} open onOpenChange={setOpen} onSuccess={openPdf} />
 */
export function CreatePdfDialog({
  subjectId,
  subjects: initialSubjects,
  open,
  onOpenChange,
  onSuccess,
}: Readonly<CreatePdfDialogProps>) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const isUploading = progress !== null;
  const emptyValues = { subjectId: subjectId ?? "", title: "" };
  const form = useForm<CreatePdfFormValues>({
    resolver: zodResolver(createPdfFormSchema),
    defaultValues: emptyValues,
  });
  const { subjects, handleCreateSubject } = useCreateInlineSubjectPicker({
    initialSubjects,
    onSubjectCreated: (createdSubjectId) =>
      form.setValue("subjectId", createdSubjectId, {
        shouldDirty: true,
        shouldValidate: true,
      }),
  });

  // The search palette keeps this dialog mounted, so pick up the current
  // subject each time it opens.
  useEffect(() => {
    if (open) {
      form.reset({ subjectId: subjectId ?? "", title: "" });
    }
  }, [form, open, subjectId]);
  const fileProblem = file
    ? getPdfFileProblem(file)
    : form.formState.isSubmitted
      ? validationMessage("Validation.pdfs.fileRequired")
      : null;

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0] ?? null;
    setFile(picked);
    if (picked && !form.getValues("title")) {
      form.setValue("title", pdfTitleFromFileName(picked.name));
    }
  }

  async function handleSubmit(values: CreatePdfFormValues) {
    if (isUploading || !file || fileProblem) return;

    setProgress(0);
    try {
      const result = await uploadPdfDocument({
        subjectId: values.subjectId,
        title: values.title,
        file,
        onProgress: setProgress,
      });
      if (!result.success) {
        toast.error(t(result.errorCode, result.errorParams));
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["search-data"] });
      notifySubjectDocumentsChanged(result.subjectId);
      onOpenChange(false);
      onSuccess(result.pdfId, result.subjectId);
    } finally {
      setProgress(null);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (isUploading) return;
    if (!nextOpen) {
      form.reset(emptyValues);
      setFile(null);
    }
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add PDF</DialogTitle>
          <DialogDescription className="sr-only">
            Upload a PDF to read in this subject.
          </DialogDescription>
        </DialogHeader>
        <form id="form-create-pdf" onSubmit={form.handleSubmit(handleSubmit)}>
          <FieldGroup className="gap-4">
            {initialSubjects ? (
              <Controller
                name="subjectId"
                control={form.control}
                render={({ field, fieldState }) => (
                  <SubjectSelect
                    value={field.value}
                    onChange={(value) => field.onChange(value ?? "")}
                    subjects={subjects}
                    id="form-create-pdf-subject"
                    error={fieldState.error?.message}
                    ariaInvalid={fieldState.invalid}
                    disabled={isUploading}
                    onCreateSubject={handleCreateSubject}
                  />
                )}
              />
            ) : null}
            <Field data-invalid={fileProblem !== null}>
              <FieldLabel htmlFor="form-create-pdf-file">File</FieldLabel>
              <Input
                id="form-create-pdf-file"
                type="file"
                accept={`${PDF_MIME_TYPE},.pdf`}
                aria-invalid={fileProblem !== null}
                disabled={isUploading}
                onChange={handleFileChange}
              />
              {fileProblem ? (
                <FieldError errors={[{ message: fileProblem }]} />
              ) : (
                <FieldDescription>
                  Up to {LIMITS.pdfMaxMegabytes} MB.
                </FieldDescription>
              )}
            </Field>
            <Controller
              name="title"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="form-create-pdf-title">Title</FieldLabel>
                  <Input
                    {...field}
                    id="form-create-pdf-title"
                    aria-invalid={fieldState.invalid}
                    disabled={isUploading}
                  />
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />
            {isUploading ? <UploadProgressBar percentage={progress} /> : null}
            <Button type="submit" disabled={isUploading} className="w-full">
              <AsyncButtonContent
                pending={isUploading}
                idleLabel="Upload PDF"
                pendingLabel="Uploading..."
              />
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function UploadProgressBar({ percentage }: Readonly<{ percentage: number }>) {
  const rounded = Math.round(percentage);
  return (
    <div
      role="progressbar"
      aria-label="Upload progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={rounded}
      className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
    >
      <div
        className="h-full bg-primary transition-[width]"
        style={{ width: `${rounded}%` }}
      />
    </div>
  );
}
