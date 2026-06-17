"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  optimizeFlashcardScheduler,
  resetFlashcardSchedulerOptimization,
  updateFsrsOptimizationPreferences,
} from "@/app/actions/account";
import {
  SettingsRow,
  SettingsSection,
} from "@/components/account/settings-section";
import { ActionConfirmationDialog } from "@/components/shared/action-confirmation-dialog";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  type UpdateFsrsOptimizationPreferencesForm,
  updateFsrsOptimizationPreferencesSchema,
} from "@/features/flashcards/fsrs/validation";
import { formatDateLong } from "@/lib/dates/format";
import type { FlashcardOptimizationSettings } from "@/lib/server/api-contracts";
import { resolveActionErrorMessage } from "@/lib/server/server-action-errors";

interface FlashcardOptimizationCardProps {
  settings: FlashcardOptimizationSettings;
  workflowsEnabled: boolean;
}

function getLastOptimizedLabel(lastOptimizedAt: string | null): string {
  return lastOptimizedAt ? formatDateLong(lastOptimizedAt) : "Never optimized";
}

export function FlashcardOptimizationCard({
  settings,
  workflowsEnabled,
}: Readonly<FlashcardOptimizationCardProps>) {
  const router = useRouter();
  const [resetOpen, setResetOpen] = useState(false);
  const [isOptimizing, startOptimization] = useTransition();
  const [isResetting, startReset] = useTransition();
  const [isSaving, startSaving] = useTransition();
  const form = useForm<UpdateFsrsOptimizationPreferencesForm>({
    resolver: zodResolver(updateFsrsOptimizationPreferencesSchema),
    defaultValues: {
      automaticOptimizationEnabled: settings.automaticOptimizationEnabled,
    },
  });
  const automaticOptimizationEnabled = form.watch(
    "automaticOptimizationEnabled",
  );
  const preferencesChanged =
    automaticOptimizationEnabled !== settings.automaticOptimizationEnabled;

  async function handleOptimizeNow() {
    startOptimization(async () => {
      const result = await optimizeFlashcardScheduler();
      if (result.success) {
        toast.success("FSRS optimization completed.");
        router.refresh();
        return;
      }

      toast.error(resolveActionErrorMessage(result));
    });
  }

  function handleReset() {
    startReset(async () => {
      const result = await resetFlashcardSchedulerOptimization();
      if (result.success) {
        setResetOpen(false);
        toast.success("FSRS optimization reset.");
        router.refresh();
        return;
      }

      toast.error(resolveActionErrorMessage(result));
    });
  }

  async function onSubmit(data: UpdateFsrsOptimizationPreferencesForm) {
    startSaving(async () => {
      const result = await updateFsrsOptimizationPreferences(data);
      if (result.success) {
        form.reset(data);
        toast.success("FSRS optimization preferences saved.");
        router.refresh();
        return;
      }

      toast.error(resolveActionErrorMessage(result));
    });
  }

  return (
    <>
      <SettingsSection title="Flashcards">
        <SettingsRow
          label="FSRS optimization"
          description={`Last optimized: ${getLastOptimizedLabel(settings.lastOptimizedAt)}`}
          keywords="flashcard scheduler optimize review"
          action={
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button
                type="button"
                onClick={handleOptimizeNow}
                disabled={isOptimizing || isResetting}
                className="w-full sm:w-fit"
              >
                <AsyncButtonContent
                  pending={isOptimizing}
                  idleLabel="Optimize now"
                  pendingLabel="Optimizing..."
                />
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => setResetOpen(true)}
                disabled={isOptimizing || isResetting}
                className="w-full sm:w-fit"
              >
                <RotateCcw className="size-4" />
                Reset
              </Button>
            </div>
          }
        />

        {workflowsEnabled ? (
          <SettingsRow
            label="Automatic optimization"
            description="Run FSRS optimization every 30 days when the scheduled workflow runs."
            keywords="flashcard scheduler auto fsrs"
            action={
              <form
                id="form-fsrs-optimization"
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex items-center gap-3"
              >
                <Controller
                  name="automaticOptimizationEnabled"
                  control={form.control}
                  render={({ field }) => (
                    <Switch
                      id="automatic-optimization-toggle"
                      aria-label="Automatic optimization"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Button
                  type="submit"
                  form="form-fsrs-optimization"
                  disabled={isSaving || !preferencesChanged}
                  size="sm"
                >
                  <AsyncButtonContent
                    pending={isSaving}
                    idleLabel="Save"
                    pendingLabel="Saving..."
                  />
                </Button>
              </form>
            }
          />
        ) : null}
      </SettingsSection>

      <ActionConfirmationDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reset Optimization"
        description="Resetting will discard the current optimized FSRS tuning and restore the default scheduler. Your review history and flashcard progress will be kept."
        confirmLabel="Reset"
        pendingLabel="Resetting..."
        confirmVariant="destructive"
        isPending={isResetting}
        onConfirm={handleReset}
      />
    </>
  );
}
