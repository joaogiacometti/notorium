"use client";

import { Loader2, Pin, PinOff, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Controller,
  type FieldPath,
  type UseFormReturn,
} from "react-hook-form";
import { SubjectText } from "@/components/shared/subject-text";
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
import type {
  CreateFlashcardForm,
  EditFlashcardForm,
} from "@/features/flashcards/validation";
import type { SubjectEntity } from "@/lib/server/api-contracts";

type FlashcardFormValues = CreateFlashcardForm | EditFlashcardForm;

interface FlashcardDialogFormProps<TValues extends FlashcardFormValues> {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: React.ReactNode;
  form: UseFormReturn<TValues>;
  formId: string;
  subjects?: SubjectEntity[];
  onSubmit: (values: TValues) => Promise<void>;
  discardDialogOpen: boolean;
  onDiscardDialogOpenChange: (open: boolean) => void;
  onDiscard: () => void;
  isGeneratingBack: boolean;
  canGenerateBack: boolean;
  onGenerateBack: () => Promise<void>;
  keepFrontAfterSubmit: boolean;
  onKeepFrontAfterSubmitChange: (value: boolean) => void;
  keepBackAfterSubmit: boolean;
  onKeepBackAfterSubmitChange: (value: boolean) => void;
}

export function FlashcardDialogForm<TValues extends FlashcardFormValues>({
  mode,
  open,
  onOpenChange,
  trigger,
  form,
  formId,
  subjects,
  onSubmit,
  discardDialogOpen,
  onDiscardDialogOpenChange,
  onDiscard,
  isGeneratingBack,
  canGenerateBack,
  onGenerateBack,
  keepFrontAfterSubmit,
  onKeepFrontAfterSubmitChange,
  keepBackAfterSubmit,
  onKeepBackAfterSubmitChange,
}: Readonly<FlashcardDialogFormProps<TValues>>) {
  const t = useTranslations(
    mode === "create" ? "CreateFlashcardDialog" : "EditFlashcardDialog",
  );

  function handleCtrlEnter() {
    if (form.formState.isSubmitting) {
      return;
    }

    void form.handleSubmit(onSubmit)();
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
        <DialogContent className="max-h-[90svh] overflow-y-auto p-4 sm:max-w-2xl sm:p-6">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
          </DialogHeader>
          <form id={formId} onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup className="gap-4">
              {subjects && subjects.length > 0 ? (
                <Controller
                  name={"subjectId" as FieldPath<TValues>}
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
                              <SubjectText
                                value={subject.name}
                                mode="truncate"
                                className="block max-w-full"
                              />
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
                name={"front" as FieldPath<TValues>}
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <div className="flex h-9 items-center justify-between gap-3">
                      <FieldLabel htmlFor={`${formId}-front`}>
                        {t("field_front")}
                      </FieldLabel>
                      <div className="flex items-center gap-1">
                        {mode === "create" ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label={
                              keepFrontAfterSubmit
                                ? t("keep_front_off")
                                : t("keep_front_on")
                            }
                            title={
                              keepFrontAfterSubmit
                                ? t("keep_front_off")
                                : t("keep_front_on")
                            }
                            aria-pressed={keepFrontAfterSubmit}
                            onClick={() =>
                              onKeepFrontAfterSubmitChange(
                                !keepFrontAfterSubmit,
                              )
                            }
                            disabled={form.formState.isSubmitting}
                          >
                            {keepFrontAfterSubmit ? (
                              <Pin className="size-3.5" />
                            ) : (
                              <PinOff className="size-3.5" />
                            )}
                          </Button>
                        ) : null}
                      </div>
                    </div>
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
                name={"back" as FieldPath<TValues>}
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-3">
                        <FieldLabel htmlFor={`${formId}-back`}>
                          {t("field_back")}
                        </FieldLabel>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            className="h-7 rounded-full px-2.5 text-muted-foreground hover:text-foreground"
                            onClick={() => void onGenerateBack()}
                            disabled={!canGenerateBack}
                          >
                            {isGeneratingBack ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Sparkles className="size-3.5" />
                            )}
                            {isGeneratingBack
                              ? t("generating_back")
                              : t("generate_back")}
                          </Button>
                          {mode === "create" ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              aria-label={
                                keepBackAfterSubmit
                                  ? t("keep_back_off")
                                  : t("keep_back_on")
                              }
                              title={
                                keepBackAfterSubmit
                                  ? t("keep_back_off")
                                  : t("keep_back_on")
                              }
                              aria-pressed={keepBackAfterSubmit}
                              onClick={() =>
                                onKeepBackAfterSubmitChange(
                                  !keepBackAfterSubmit,
                                )
                              }
                              disabled={form.formState.isSubmitting}
                            >
                              {keepBackAfterSubmit ? (
                                <Pin className="size-3.5" />
                              ) : (
                                <PinOff className="size-3.5" />
                              )}
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <TiptapEditor
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      placeholder={t("field_back_placeholder")}
                      id={`${formId}-back`}
                      aria-invalid={fieldState.invalid}
                      contentClassName="max-h-[10lh]"
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
        onOpenChange={onDiscardDialogOpenChange}
        onDiscard={onDiscard}
      />
    </>
  );
}
