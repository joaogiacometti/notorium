"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  Controller,
  type UseFormReturn,
  useForm,
  useWatch,
} from "react-hook-form";
import { toast } from "sonner";
import { generateFlashcardBack } from "@/app/actions/flashcards";
import { TiptapEditor } from "@/components/shared/tiptap-editor";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type CreateFlashcardForm,
  createFlashcardSchema,
  type EditFlashcardForm,
  editFlashcardSchema,
  hasRichTextContent,
} from "@/features/flashcards/validation";
import { useBeforeUnload } from "@/lib/editor/use-before-unload";
import type {
  FlashcardEntity,
  SubjectEntity,
} from "@/lib/server/api-contracts";
import type { ActionErrorResult } from "@/lib/server/server-action-errors";
import { resolveActionErrorMessage } from "@/lib/server/server-action-errors";

type FlashcardFormValues = CreateFlashcardForm | EditFlashcardForm;

interface FlashcardDialogFormProps {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: React.ReactNode;
  values: FlashcardFormValues;
  subjects?: SubjectEntity[];
  onSubmitAction: (
    values: FlashcardFormValues,
  ) => Promise<
    { success: true; flashcard?: FlashcardEntity } | ActionErrorResult
  >;
  onSuccess?: (flashcard?: FlashcardEntity) => void | Promise<void>;
}

function useFlashcardForm(
  mode: "create" | "edit",
  values: FlashcardFormValues,
): UseFormReturn<FlashcardFormValues> {
  return useForm<FlashcardFormValues>({
    resolver: zodResolver(
      mode === "create" ? createFlashcardSchema : editFlashcardSchema,
    ),
    defaultValues: values,
  });
}

export function FlashcardDialogForm({
  mode,
  open,
  onOpenChange,
  trigger,
  values,
  subjects,
  onSubmitAction,
  onSuccess,
}: Readonly<FlashcardDialogFormProps>) {
  const t = useTranslations(
    mode === "create" ? "CreateFlashcardDialog" : "EditFlashcardDialog",
  );
  const tErrors = useTranslations("ServerActions");
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [isGeneratingBack, setIsGeneratingBack] = useState(false);
  const form = useFlashcardForm(mode, values);

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

  async function onSubmit(data: FlashcardFormValues) {
    const result = await onSubmitAction(data);
    if (result.success) {
      let resetValues: FlashcardFormValues;

      if (mode === "create") {
        resetValues =
          "subjectId" in values
            ? {
                subjectId: values.subjectId,
                front: "",
                back: "",
              }
            : values;
      } else {
        resetValues = data;
      }

      form.reset(resetValues);
      setDiscardDialogOpen(false);
      await onSuccess?.(result.flashcard);
      onOpenChange(false);
      return;
    }

    toast.error(resolveActionErrorMessage(result, tErrors));
  }

  async function handleGenerateBack() {
    const currentValues = form.getValues();

    if (
      !("subjectId" in currentValues) ||
      !hasRichTextContent(currentValues.front) ||
      hasRichTextContent(currentValues.back) ||
      isGeneratingBack
    ) {
      return;
    }

    setIsGeneratingBack(true);

    const result = await generateFlashcardBack({
      subjectId: currentValues.subjectId,
      front: currentValues.front,
    });

    setIsGeneratingBack(false);

    if (!result.success) {
      toast.error(resolveActionErrorMessage(result, tErrors));
      return;
    }

    form.setValue("back", result.back, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  }

  function handleCtrlEnter() {
    if (form.formState.isSubmitting) {
      return;
    }

    void form.handleSubmit(onSubmit)();
  }

  const formId =
    mode === "create" ? "form-create-flashcard" : "form-edit-flashcard";
  const [subjectIdValue, frontValue, backValue] = useWatch({
    control: form.control,
    name: ["subjectId", "front", "back"],
  });
  const canGenerateBack =
    typeof subjectIdValue === "string" &&
    subjectIdValue.length > 0 &&
    hasRichTextContent(frontValue ?? "") &&
    !hasRichTextContent(backValue ?? "") &&
    !isGeneratingBack &&
    !form.formState.isSubmitting;

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
              {mode === "create" && subjects && subjects.length > 0 ? (
                <Controller
                  name="subjectId"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={`${formId}-subject`}>
                        {t("field_subject")}
                      </FieldLabel>
                      <Select
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger
                          id={`${formId}-subject`}
                          aria-invalid={fieldState.invalid}
                        >
                          <SelectValue
                            placeholder={t("field_subject_placeholder")}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {subjects.map((subject) => (
                            <SelectItem key={subject.id} value={subject.id}>
                              {subject.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.invalid ? (
                        <FieldError errors={[fieldState.error]} />
                      ) : null}
                    </Field>
                  )}
                />
              ) : null}
              <Controller
                name="front"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={`${formId}-front`}>
                      {t("field_front")}
                    </FieldLabel>
                    <TiptapEditor
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      placeholder={t("field_front_placeholder")}
                      id={`${formId}-front`}
                      aria-invalid={fieldState.invalid}
                      contentClassName="min-h-11 max-h-[40svh]"
                      showToolbar={false}
                      onCtrlEnter={handleCtrlEnter}
                    />
                    {fieldState.invalid ? (
                      <FieldError errors={[fieldState.error]} />
                    ) : null}
                  </Field>
                )}
              />
              <Controller
                name="back"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <div className="flex items-center justify-between gap-3">
                      <FieldLabel htmlFor={`${formId}-back`}>
                        {t("field_back")}
                      </FieldLabel>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void handleGenerateBack()}
                        disabled={!canGenerateBack}
                      >
                        {isGeneratingBack ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : null}
                        {isGeneratingBack
                          ? t("generating_back")
                          : t("generate_back")}
                      </Button>
                    </div>
                    <TiptapEditor
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      placeholder={t("field_back_placeholder")}
                      id={`${formId}-back`}
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
                disabled={form.formState.isSubmitting || isGeneratingBack}
                className="w-full"
              >
                {form.formState.isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                {t("submit")}
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
