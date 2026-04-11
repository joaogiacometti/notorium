"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Settings } from "lucide-react";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { updateAttendanceSettings } from "@/app/actions/attendance";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  type AttendanceSettingsForm,
  attendanceSettingsSchema,
} from "@/features/attendance/validation";
import { resolveActionErrorMessage } from "@/lib/server/server-action-errors";

interface AttendanceSettingsDialogProps {
  subjectId: string;
  totalClasses: number | null;
  maxMisses: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AttendanceSettingsDialog({
  subjectId,
  totalClasses,
  maxMisses,
  open,
  onOpenChange,
}: Readonly<AttendanceSettingsDialogProps>) {
  const [_isPending, _startTransition] = useTransition();
  const form = useForm({
    resolver: zodResolver(attendanceSettingsSchema),
    defaultValues: {
      subjectId,
      totalClasses: totalClasses ?? 15,
      maxMisses: maxMisses ?? 4,
    },
  });

  async function onSubmit(data: AttendanceSettingsForm) {
    const result = await updateAttendanceSettings(data);
    if (result.success) {
      onOpenChange(false);
    } else {
      toast.error(resolveActionErrorMessage(result));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Settings className="size-3.5" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Attendance Settings</DialogTitle>
          <DialogDescription>
            Configure the total number of classes and maximum allowed misses for
            this subject.
          </DialogDescription>
        </DialogHeader>
        <form
          id="form-attendance-settings"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <FieldGroup className="gap-4">
            <Controller
              name="totalClasses"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="form-attendance-total-classes">
                    Total Classes
                  </FieldLabel>
                  <Input
                    id="form-attendance-total-classes"
                    type="number"
                    min={1}
                    max={365}
                    placeholder="e.g. 15"
                    aria-invalid={fieldState.invalid}
                    autoFocus
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
            <Controller
              name="maxMisses"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="form-attendance-max-misses">
                    Max Allowed Misses
                  </FieldLabel>
                  <Input
                    id="form-attendance-max-misses"
                    type="number"
                    min={0}
                    max={365}
                    placeholder="e.g. 4"
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
              form="form-attendance-settings"
              disabled={form.formState.isSubmitting}
              className="w-full"
            >
              <AsyncButtonContent
                pending={form.formState.isSubmitting}
                idleLabel="Save Settings"
                pendingLabel="Saving..."
              />
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
