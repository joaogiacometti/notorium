"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Controller, type UseFormReturn, useForm } from "react-hook-form";
import { toast } from "sonner";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { LazyTiptapEditor as TiptapEditor } from "@/components/shared/lazy-tiptap-editor";
import { UnsavedChangesDialog } from "@/components/shared/unsaved-changes-dialog";
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
  type CreateNoteForm,
  createNoteSchema,
  type EditNoteForm,
  editNoteSchema,
} from "@/features/notes/validation";
import { useBeforeUnload } from "@/lib/editor/use-before-unload";
import type { ActionErrorResult } from "@/lib/server/server-action-errors";
import { resolveActionErrorMessage } from "@/lib/server/server-action-errors";

type NoteFormValues = CreateNoteForm | EditNoteForm;

interface NoteDialogFormProps {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: React.ReactNode;
  values: NoteFormValues;
  onSubmitAction: (
    values: NoteFormValues,
  ) => Promise<{ success: true } | ActionErrorResult>;
}

function useNoteForm(
  mode: "create" | "edit",
  values: NoteFormValues,
): UseFormReturn<NoteFormValues> {
  return useForm<NoteFormValues>({
    resolver: zodResolver(
      mode === "create" ? createNoteSchema : editNoteSchema,
    ),
    defaultValues: values,
  });
}

export function NoteDialogForm({
  mode,
  open,
  onOpenChange,
  trigger,
  values,
  onSubmitAction,
}: Readonly<NoteDialogFormProps>) {
  const t = useTranslations(
    mode === "create" ? "CreateNoteDialog" : "EditNoteDialog",
  );
  const tCommon = useTranslations("Common");
  const tErrors = useTranslations("ServerActions");
  const queryClient = useQueryClient();
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const form = useNoteForm(mode, values);

  useEffect(() => {
    form.reset(values);
  }, [form, values]);

  useBeforeUnload(
    open && form.formState.isDirty && !form.formState.isSubmitting,
  );

  function handleDiscardChanges() {
    form.reset(values);
    setDiscardDialogOpen(false);
    onOpenChange(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setDiscardDialogOpen(false);
      onOpenChange(true);
      return;
    }

    if (form.formState.isDirty && !form.formState.isSubmitting) {
      setDiscardDialogOpen(true);
      return;
    }

    form.reset(values);
    setDiscardDialogOpen(false);
    onOpenChange(false);
  }

  async function onSubmit(data: NoteFormValues) {
    const result = await onSubmitAction(data);
    if (result.success) {
      await queryClient.invalidateQueries({ queryKey: ["search-data"] });
      form.reset(
        mode === "create"
          ? "subjectId" in values
            ? { subjectId: values.subjectId, title: "", content: "" }
            : values
          : data,
      );
      setDiscardDialogOpen(false);
      onOpenChange(false);
      return;
    }

    toast.error(resolveActionErrorMessage(result, tErrors));
  }

  function handleCtrlEnter() {
    if (form.formState.isSubmitting) {
      return;
    }

    void form.handleSubmit(onSubmit)();
  }

  const formId = mode === "create" ? "form-create-note" : "form-edit-note";

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
        <DialogContent className="max-h-[90svh] overflow-y-auto p-4 sm:max-w-2xl sm:p-6">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
          </DialogHeader>
          <form id={formId} onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup className="gap-4">
              <Controller
                name="title"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={`${formId}-title`}>
                      {t("field_title")}
                    </FieldLabel>
                    <Input
                      {...field}
                      id={`${formId}-title`}
                      placeholder={t("field_title_placeholder")}
                      aria-invalid={fieldState.invalid}
                      autoFocus
                    />
                    {fieldState.invalid ? (
                      <FieldError errors={[fieldState.error]} />
                    ) : null}
                  </Field>
                )}
              />
              <Controller
                name="content"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={`${formId}-content`}>
                      {t("field_content")}
                    </FieldLabel>
                    <TiptapEditor
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      placeholder={t("field_content_placeholder")}
                      id={`${formId}-content`}
                      aria-invalid={fieldState.invalid}
                      onCtrlEnter={handleCtrlEnter}
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
                disabled={form.formState.isSubmitting}
                className="w-full"
              >
                <AsyncButtonContent
                  pending={form.formState.isSubmitting}
                  idleLabel={t("submit")}
                  pendingLabel={
                    mode === "create" ? tCommon("creating") : tCommon("saving")
                  }
                />
              </Button>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>
      <UnsavedChangesDialog
        open={discardDialogOpen}
        onOpenChange={setDiscardDialogOpen}
        onDiscard={handleDiscardChanges}
      />
    </>
  );
}
