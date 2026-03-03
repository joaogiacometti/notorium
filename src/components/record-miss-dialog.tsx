"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { recordMiss } from "@/app/actions/attendance";
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
} from "@/lib/validations/attendance";

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
    } else if (result.error) {
      form.setError("missDate", { message: result.error });
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
                  <FieldLabel htmlFor="form-record-miss-date">Date</FieldLabel>
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
              {form.formState.isSubmitting && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Record Miss
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
