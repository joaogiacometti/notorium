"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { createSubject } from "@/app/actions/subjects";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  type CreateSubjectForm,
  createSubjectSchema,
} from "@/lib/validations/subjects";

interface CreateSubjectDialogProps {
  trigger: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateSubjectDialog({
  trigger,
  open,
  onOpenChange,
}: Readonly<CreateSubjectDialogProps>) {
  const t = useTranslations("CreateSubjectDialog");
  const queryClient = useQueryClient();
  const form = useForm({
    resolver: zodResolver(createSubjectSchema),
    defaultValues: {
      name: "",
      description: "",
      notesEnabled: true,
      gradesEnabled: true,
      attendanceEnabled: true,
    },
  });

  async function onSubmit(data: CreateSubjectForm) {
    const result = await createSubject(data);
    if (result.success) {
      await queryClient.invalidateQueries({ queryKey: ["search-data"] });
      form.reset();
      onOpenChange(false);
    } else if (result.error) {
      toast.error(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <form id="form-create-subject" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="gap-4">
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="form-create-subject-name">
                    {t("field_name")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="form-create-subject-name"
                    placeholder={t("field_name_placeholder")}
                    aria-invalid={fieldState.invalid}
                    autoFocus
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="description"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="form-create-subject-description">
                    {t("field_description")}
                  </FieldLabel>
                  <Textarea
                    {...field}
                    id="form-create-subject-description"
                    placeholder={t("field_description_placeholder")}
                    rows={3}
                    className="resize-none"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground">
                {t("section_modules")}
              </h3>
              <div className="space-y-2">
                <Controller
                  name="notesEnabled"
                  control={form.control}
                  render={({ field }) => (
                    <div className="flex items-center justify-between rounded-lg border p-3 shadow-xs">
                      <div>
                        <span className="text-sm font-medium">
                          {t("section_notes")}
                        </span>
                        <p className="text-[0.8rem] text-muted-foreground">
                          {t("section_notes_desc")}
                        </p>
                      </div>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </div>
                  )}
                />
                <Controller
                  name="gradesEnabled"
                  control={form.control}
                  render={({ field }) => (
                    <div className="flex items-center justify-between rounded-lg border p-3 shadow-xs">
                      <div>
                        <span className="text-sm font-medium">
                          {t("section_assessments")}
                        </span>
                        <p className="text-[0.8rem] text-muted-foreground">
                          {t("section_assessments_desc")}
                        </p>
                      </div>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </div>
                  )}
                />
                <Controller
                  name="attendanceEnabled"
                  control={form.control}
                  render={({ field }) => (
                    <div className="flex items-center justify-between rounded-lg border p-3 shadow-xs">
                      <div>
                        <span className="text-sm font-medium">
                          {t("section_attendance")}
                        </span>
                        <p className="text-[0.8rem] text-muted-foreground">
                          {t("section_attendance_desc")}
                        </p>
                      </div>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </div>
                  )}
                />
              </div>
            </div>

            <Button
              type="submit"
              form="form-create-subject"
              disabled={form.formState.isSubmitting}
              className="w-full"
            >
              {form.formState.isSubmitting && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {t("submit")}
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
