"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { editGrade } from "@/app/actions/grades";
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
import { type EditGradeForm, editGradeSchema } from "@/lib/validations/grades";

interface EditGradeDialogProps {
  grade: {
    id: string;
    name: string;
    value: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditGradeDialog({
  grade: gradeData,
  open,
  onOpenChange,
}: Readonly<EditGradeDialogProps>) {
  const form = useForm({
    resolver: zodResolver(editGradeSchema),
    defaultValues: {
      id: gradeData.id,
      name: gradeData.name,
      value: Number(gradeData.value),
    },
  });

  async function onSubmit(data: EditGradeForm) {
    const result = await editGrade(data);
    if (result.success) {
      onOpenChange(false);
    } else if (result.error) {
      form.setError("name", { message: result.error });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Grade</DialogTitle>
          <DialogDescription>Update the grade name or value.</DialogDescription>
        </DialogHeader>
        <form id="form-edit-grade" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="gap-4">
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="form-edit-grade-name">
                    Grade Name
                  </FieldLabel>
                  <Input
                    {...field}
                    id="form-edit-grade-name"
                    placeholder="e.g. Exam 1"
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
              name="value"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="form-edit-grade-value">
                    Value (0 – 100)
                  </FieldLabel>
                  <Input
                    id="form-edit-grade-value"
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    placeholder="e.g. 85"
                    aria-invalid={fieldState.invalid}
                    value={field.value}
                    onBlur={field.onBlur}
                    ref={field.ref}
                    name={field.name}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Button
              type="submit"
              form="form-edit-grade"
              disabled={form.formState.isSubmitting}
              className="w-full"
            >
              {form.formState.isSubmitting && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
