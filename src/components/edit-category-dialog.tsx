"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { editGradeCategory } from "@/app/actions/grades";
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
  type EditGradeCategoryForm,
  editGradeCategorySchema,
} from "@/lib/validations/grades";

interface EditCategoryDialogProps {
  category: {
    id: string;
    name: string;
    weight: string | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditCategoryDialog({
  category,
  open,
  onOpenChange,
}: Readonly<EditCategoryDialogProps>) {
  const form = useForm<EditGradeCategoryForm>({
    resolver: zodResolver(editGradeCategorySchema),
    defaultValues: {
      id: category.id,
      name: category.name,
      weight: category.weight ? Number(category.weight) : undefined,
    },
  });

  async function onSubmit(data: EditGradeCategoryForm) {
    const result = await editGradeCategory(data);
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
          <DialogTitle>Edit Category</DialogTitle>
          <DialogDescription>
            Update the category name or weight.
          </DialogDescription>
        </DialogHeader>
        <form id="form-edit-category" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="gap-4">
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="form-edit-category-name">
                    Category Name
                  </FieldLabel>
                  <Input
                    {...field}
                    id="form-edit-category-name"
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
                  <FieldLabel htmlFor="form-edit-category-weight">
                    Weight (optional)
                  </FieldLabel>
                  <Input
                    id="form-edit-category-weight"
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
              form="form-edit-category"
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
