"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { recordMiss } from "@/app/actions/attendance";
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
  type RecordMissForm,
  recordMissSchema,
} from "@/features/attendance/validation";
import { resolveActionErrorMessage } from "@/lib/server/server-action-errors";

interface RecordMissDialogProps {
  subjectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RecordMissDialog({
  subjectId,
  open,
  onOpenChange,
}: Readonly<RecordMissDialogProps>) {
  const t = useTranslations("RecordMissDialog");
  const tCommon = useTranslations("Common");
  const tErrors = useTranslations("ServerActions");
  const today = new Date().toISOString().split("T")[0];

  const form = useForm({
    resolver: zodResolver(recordMissSchema),
    defaultValues: {
      subjectId,
      missDate: today,
    },
  });

  async function onSubmit(data: RecordMissForm) {
    const result = await recordMiss(data);
    if (result.success) {
      form.reset({ subjectId, missDate: today });
      onOpenChange(false);
    } else {
      form.setError("missDate", {
        message: resolveActionErrorMessage(result, tErrors),
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <form id="form-record-miss" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="gap-4">
            <Controller
              name="missDate"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="form-record-miss-date">
                    {t("field_date")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="form-record-miss-date"
                    type="date"
                    aria-invalid={fieldState.invalid}
                    autoFocus
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Button
              type="submit"
              form="form-record-miss"
              disabled={form.formState.isSubmitting}
              className="w-full"
            >
              <AsyncButtonContent
                pending={form.formState.isSubmitting}
                idleLabel={t("submit")}
                pendingLabel={tCommon("creating")}
              />
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
