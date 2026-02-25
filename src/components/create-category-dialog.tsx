"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { createGradeCategory } from "@/app/actions/grades";
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
  type CreateGradeCategoryForm,
  createGradeCategorySchema,
} from "@/lib/validations/grades";

interface CreateCategoryDialogProps {
  subjectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCategoryDialog({
  subjectId,
  open,
  onOpenChange,
}: Readonly<CreateCategoryDialogProps>) {
  const form = useForm({
    resolver: zodResolver(createGradeCategorySchema),
    defaultValues: {
      subjectId,
      name: "",
      weight: undefined,
    },
  });

  async function onSubmit(data: CreateGradeCategoryForm) {
    const result = await createGradeCategory(data);
    if (result.success) {
      form.reset({ subjectId, name: "", weight: undefined });
      onOpenChange(false);
    } else if (result.error) {
      form.setError("name", { message: result.error });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Grade Category</DialogTitle>
          <DialogDescription>
            Create a new category to organize your grades (e.g. Exams,
            Activities, Lists). Optionally assign a weight for weighted
            averages.
          </DialogDescription>
        </DialogHeader>
        <form id="form-create-category" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="gap-4">
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="form-create-category-name">
                    Category Name
                  </FieldLabel>
                  <Input
                    {...field}
                    id="form-create-category-name"
                    placeholder="e.g. Exams"
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
              name="weight"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="form-create-category-weight">
                    Weight (optional)
                  </FieldLabel>
                  <Input
                    id="form-create-category-weight"
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    placeholder="e.g. 40"
                    aria-invalid={fieldState.invalid}
                    value={field.value ?? ""}
                    onBlur={field.onBlur}
                    ref={field.ref}
                    name={field.name}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === ""
                          ? undefined
                          : e.target.valueAsNumber,
                      )
                    }
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Button
              type="submit"
              form="form-create-category"
              disabled={form.formState.isSubmitting}
              className="w-full"
            >
              {form.formState.isSubmitting && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Add Category
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
