"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
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
      router.refresh();
    } else {
      form.setError("missDate", {
        message: resolveActionErrorMessage(result),
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record a Miss</DialogTitle>
          <DialogDescription>
            Select the date you missed a class for this subject.
          </DialogDescription>
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
              <AsyncButtonContent
                pending={form.formState.isSubmitting}
                idleLabel="Record Miss"
                pendingLabel="Creating..."
              />
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
