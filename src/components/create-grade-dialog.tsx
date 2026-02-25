"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { createGrade } from "@/app/actions/grades";
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
  type CreateGradeForm,
  createGradeSchema,
} from "@/lib/validations/grades";

interface CreateGradeDialogProps {
  categoryId: string;
  categoryName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateGradeDialog({
  categoryId,
  categoryName,
  open,
  onOpenChange,
}: Readonly<CreateGradeDialogProps>) {
  const form = useForm({
    resolver: zodResolver(createGradeSchema),
    defaultValues: {
      categoryId,
      name: "",
      value: 0,
    },
  });

  async function onSubmit(data: CreateGradeForm) {
    const result = await createGrade(data);
    if (result.success) {
      form.reset({ categoryId, name: "", value: 0 });
      onOpenChange(false);
    } else if (result.error) {
      form.setError("name", { message: result.error });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Grade</DialogTitle>
          <DialogDescription>
            {"Add a new grade to "}
            <span className="font-semibold text-foreground">
              {categoryName}
            </span>
            {"."}
          </DialogDescription>
        </DialogHeader>
        <form id="form-create-grade" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="gap-4">
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="form-create-grade-name">
                    Grade Name
                  </FieldLabel>
                  <Input
                    {...field}
                    id="form-create-grade-name"
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
                  <FieldLabel htmlFor="form-create-grade-value">
                    Value (0 – 100)
                  </FieldLabel>
                  <Input
                    id="form-create-grade-value"
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
              form="form-create-grade"
              disabled={form.formState.isSubmitting}
              className="w-full"
            >
              {form.formState.isSubmitting && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Add Grade
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
