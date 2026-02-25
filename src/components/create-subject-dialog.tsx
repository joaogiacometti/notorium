"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
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
          <DialogTitle>Create Subject</DialogTitle>
        </DialogHeader>
        <form id="form-create-subject" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="gap-4">
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="form-create-subject-name">
                    Name
                  </FieldLabel>
                  <Input
                    {...field}
                    id="form-create-subject-name"
                    placeholder="e.g. Calculus I"
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
                    Description
                  </FieldLabel>
                  <Textarea
                    {...field}
                    id="form-create-subject-description"
                    placeholder="Optional description..."
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
              <h3 className="text-sm font-medium text-foreground">Modules</h3>
              <div className="space-y-2">
                <Controller
                  name="notesEnabled"
                  control={form.control}
                  render={({ field }) => (
                    <div className="flex items-center justify-between rounded-lg border p-3 shadow-xs">
                      <div>
                        <span className="text-sm font-medium">Notes</span>
                        <p className="text-[0.8rem] text-muted-foreground">
                          Markdown notes for studying.
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
                        <span className="text-sm font-medium">Grades</span>
                        <p className="text-[0.8rem] text-muted-foreground">
                          Track your grades and calculate averages.
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
                        <span className="text-sm font-medium">Attendance</span>
                        <p className="text-[0.8rem] text-muted-foreground">
                          Track missed classes against limits.
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
              Create Subject
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
