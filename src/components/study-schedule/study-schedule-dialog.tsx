"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  removeStudySchedule,
  saveStudySchedule,
} from "@/app/actions/study-schedule";
import { ActionConfirmationDialog } from "@/components/shared/action-confirmation-dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STUDY_WEEKDAY_LABELS } from "@/features/study-schedule/constants";
import {
  buildStudyWeekOccurrences,
  isStudyTermWithinLimit,
} from "@/features/study-schedule/utils";
import {
  type StudyScheduleForm,
  studyScheduleSchema,
} from "@/features/study-schedule/validation";
import { resolveActionErrorMessage } from "@/lib/server/server-action-errors";

interface StudyScheduleDialogProps {
  subjectId: string;
  weekday: number | null;
  termStart: string | null;
  termEnd: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StudyScheduleDialog({
  subjectId,
  weekday,
  termStart,
  termEnd,
  open,
  onOpenChange,
}: Readonly<StudyScheduleDialogProps>) {
  const [isPending, startTransition] = useTransition();
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const form = useForm({
    resolver: zodResolver(studyScheduleSchema),
    defaultValues: {
      subjectId,
      weekday: weekday ?? 1,
      termStart: termStart ?? "",
      termEnd: termEnd ?? "",
    },
  });
  const isBusy = isPending || form.formState.isSubmitting;

  async function onSubmit(data: StudyScheduleForm) {
    const result = await saveStudySchedule(data);
    if (result.success) {
      onOpenChange(false);
    } else {
      toast.error(resolveActionErrorMessage(result));
    }
  }

  function handleRemove() {
    startTransition(async () => {
      const result = await removeStudySchedule({ subjectId });
      if (result.success) {
        setShowRemoveConfirm(false);
        onOpenChange(false);
      } else {
        toast.error(resolveActionErrorMessage(result));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Study Schedule</DialogTitle>
          <DialogDescription>
            Pick the weekly class day and the term dates. A "Study week N
            content" task is created for each class week.
          </DialogDescription>
        </DialogHeader>
        <form id="form-study-schedule" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="gap-4">
            <WeekdayField form={form} />
            <DateField form={form} name="termStart" label="Term Start" />
            <DateField form={form} name="termEnd" label="Term End" />
            <PreviewWeeksNote weeks={countPreviewWeeks(form.watch())} />
            <ScheduleActions
              isBusy={isBusy}
              isSaving={form.formState.isSubmitting}
              canRemove={weekday !== null}
              onRemove={() => setShowRemoveConfirm(true)}
            />
          </FieldGroup>
        </form>
        <ActionConfirmationDialog
          open={showRemoveConfirm}
          onOpenChange={setShowRemoveConfirm}
          title="Remove Study Schedule"
          description="Untouched pending study tasks for this subject will be deleted. Completed or edited study tasks are kept."
          confirmLabel="Remove"
          pendingLabel="Removing..."
          confirmVariant="destructive"
          isPending={isPending}
          onConfirm={handleRemove}
        />
      </DialogContent>
    </Dialog>
  );
}

type StudyScheduleFormApi = ReturnType<typeof useForm<StudyScheduleForm>>;

interface ScheduleActionsProps {
  isBusy: boolean;
  isSaving: boolean;
  canRemove: boolean;
  onRemove: () => void;
}

// Both buttons lock while either save or removal runs so the two never race.
function ScheduleActions({
  isBusy,
  isSaving,
  canRemove,
  onRemove,
}: Readonly<ScheduleActionsProps>) {
  return (
    <>
      <Button
        type="submit"
        form="form-study-schedule"
        disabled={isBusy}
        className="w-full"
      >
        <AsyncButtonContent
          pending={isSaving}
          idleLabel="Save Schedule"
          pendingLabel="Saving..."
        />
      </Button>
      {canRemove && (
        <Button
          type="button"
          variant="destructive"
          onClick={onRemove}
          disabled={isBusy}
          className="w-full"
        >
          Remove Schedule
        </Button>
      )}
    </>
  );
}

function PreviewWeeksNote({ weeks }: Readonly<{ weeks: number }>) {
  if (weeks === 0) return null;
  return (
    <p className="text-sm text-muted-foreground">
      Creates {weeks} weekly study {weeks === 1 ? "task" : "tasks"}. Completed
      or edited tasks are kept when you save again.
    </p>
  );
}

function WeekdayField({ form }: Readonly<{ form: StudyScheduleFormApi }>) {
  return (
    <Controller
      name="weekday"
      control={form.control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor="form-study-schedule-weekday">
            Class Day
          </FieldLabel>
          <Select
            value={String(field.value)}
            onValueChange={(value) => field.onChange(Number(value))}
          >
            <SelectTrigger id="form-study-schedule-weekday">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STUDY_WEEKDAY_LABELS.map((label, index) => (
                <SelectItem key={label} value={String(index)}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}

function countPreviewWeeks(values: Partial<StudyScheduleForm>): number {
  const { weekday, termStart, termEnd } = values;
  if (weekday === undefined || !termStart || !termEnd) return 0;
  if (termEnd < termStart) return 0;
  // Skip expanding absurd ranges so a mistyped year can't freeze the dialog.
  if (!isStudyTermWithinLimit(termStart, termEnd)) return 0;
  return buildStudyWeekOccurrences(weekday, termStart, termEnd).length;
}

interface DateFieldProps {
  form: StudyScheduleFormApi;
  name: "termStart" | "termEnd";
  label: string;
}

function DateField({ form, name, label }: Readonly<DateFieldProps>) {
  return (
    <Controller
      name={name}
      control={form.control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={`form-study-schedule-${name}`}>
            {label}
          </FieldLabel>
          <Input
            id={`form-study-schedule-${name}`}
            type="date"
            aria-invalid={fieldState.invalid}
            {...field}
          />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
