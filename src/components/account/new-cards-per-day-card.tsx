"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { updateNewCardsPerDay } from "@/app/actions/account";
import { SettingsCard } from "@/components/account/settings-section";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  type UpdateNewCardsPerDayForm,
  updateNewCardsPerDaySchema,
} from "@/features/flashcards/fsrs/validation";
import { invalidateAccountSettings } from "@/lib/client-cache/invalidation";
import { LIMITS } from "@/lib/config/limits";
import { resolveActionErrorMessage } from "@/lib/server/server-action-errors";

export function NewCardsPerDayCard({
  newCardsPerDay,
}: Readonly<{ newCardsPerDay: number }>) {
  const queryClient = useQueryClient();
  const form = useForm({
    resolver: zodResolver(updateNewCardsPerDaySchema),
    defaultValues: { newCardsPerDay },
  });
  const { isDirty, isSubmitting } = form.formState;

  async function onSubmit(data: UpdateNewCardsPerDayForm) {
    const result = await updateNewCardsPerDay(data);
    if (result.success) {
      form.reset(data);
      toast.success("New cards per day saved.");
      await invalidateAccountSettings(queryClient);
      return;
    }
    toast.error(resolveActionErrorMessage(result));
  }

  return (
    <SettingsCard
      title="New cards per day"
      description="How many unseen cards you start each day. Reviews of cards you've started are never limited."
      keywords="flashcard new cards daily limit workload"
    >
      <form id="form-new-cards-per-day" onSubmit={form.handleSubmit(onSubmit)}>
        <Controller
          name="newCardsPerDay"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="form-new-cards-per-day-input">
                Daily limit
              </FieldLabel>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  ref={field.ref}
                  name={field.name}
                  onBlur={field.onBlur}
                  value={Number.isNaN(field.value) ? "" : field.value}
                  onChange={(event) =>
                    field.onChange(event.target.valueAsNumber)
                  }
                  id="form-new-cards-per-day-input"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={LIMITS.newCardsPerDayMax}
                  step={1}
                  aria-invalid={fieldState.invalid}
                  className="sm:max-w-32"
                />
                {isDirty ? (
                  <div className="flex gap-2">
                    <Button type="submit" disabled={isSubmitting}>
                      <AsyncButtonContent
                        pending={isSubmitting}
                        idleLabel="Save"
                        pendingLabel="Saving…"
                      />
                    </Button>
                    {isSubmitting ? null : (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => form.reset()}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                ) : null}
              </div>
              {fieldState.invalid && (
                <FieldError
                  errors={[
                    {
                      message: `Enter a whole number from 0 to ${LIMITS.newCardsPerDayMax}.`,
                    },
                  ]}
                />
              )}
            </Field>
          )}
        />
      </form>
    </SettingsCard>
  );
}
