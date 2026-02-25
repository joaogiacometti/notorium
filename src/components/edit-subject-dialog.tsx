"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { editSubject } from "@/app/actions/subjects";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  type EditSubjectForm,
  editSubjectSchema,
} from "@/lib/validations/subjects";

interface EditSubjectDialogProps {
  subject: {
    id: string;
    name: string;
    description: string | null;
    notesEnabled: boolean;
    gradesEnabled: boolean;
    attendanceEnabled: boolean;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditSubjectDialog({
  subject,
  open,
  onOpenChange,
}: Readonly<EditSubjectDialogProps>) {
  const form = useForm({
    resolver: zodResolver(editSubjectSchema),
    defaultValues: {
      id: subject.id,
      name: subject.name,
      description: subject.description ?? "",
      notesEnabled: subject.notesEnabled,
      gradesEnabled: subject.gradesEnabled,
      attendanceEnabled: subject.attendanceEnabled,
    },
  });

  async function onSubmit(data: EditSubjectForm) {
    const result = await editSubject(data);
    if (result.success) {
      onOpenChange(false);
    } else if (result.error) {
      toast.error(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Subject</DialogTitle>
        </DialogHeader>
        <form id="form-edit-subject" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="gap-4">
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="form-edit-subject-name">Name</FieldLabel>
                  <Input
                    {...field}
                    id="form-edit-subject-name"
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
                  <FieldLabel htmlFor="form-edit-subject-description">
                    Description
                  </FieldLabel>
                  <Textarea
                    {...field}
                    id="form-edit-subject-description"
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
              form="form-edit-subject"
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
