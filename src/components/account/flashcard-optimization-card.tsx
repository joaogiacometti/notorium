"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { BrainCircuit, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  optimizeFlashcardScheduler,
  resetFlashcardSchedulerOptimization,
  updateFsrsOptimizationPreferences,
} from "@/app/actions/account";
import { ActionConfirmationDialog } from "@/components/shared/action-confirmation-dialog";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldDescription, FieldGroup } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
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
      <Card className="gap-4 py-5">
        <CardHeader className="pb-0">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-primary/10 p-2 text-primary">
              <BrainCircuit className="size-4" />
            </div>
            <div className="space-y-1">
              <CardTitle>Flashcard Optimization</CardTitle>
              <CardDescription>
                Tune FSRS scheduling from your review history.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <FieldGroup className="gap-4">
            <div className="rounded-lg border bg-muted/20 px-3 py-2.5 text-sm">
              <span className="text-muted-foreground">Last optimized:</span>{" "}
              {getLastOptimizedLabel(settings.lastOptimizedAt)}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
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

            {workflowsEnabled && (
              <form
                id="form-fsrs-optimization"
                onSubmit={form.handleSubmit(onSubmit)}
              >
                <FieldGroup className="gap-4">
                  <div className="flex items-center justify-between gap-4 rounded-lg border bg-card px-3 py-2.5">
                    <div className="space-y-0.5">
                      <Label htmlFor="automatic-optimization-toggle">
                        Automatic optimization
                      </Label>
                      <FieldDescription className="text-xs sm:text-sm">
                        Run FSRS optimization every 30 days when the scheduled
                        workflow runs.
                      </FieldDescription>
                    </div>
                    <Controller
                      name="automaticOptimizationEnabled"
                      control={form.control}
                      render={({ field }) => (
                        <Switch
                          id="automatic-optimization-toggle"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                  </div>

                  <Button
                    type="submit"
                    form="form-fsrs-optimization"
                    disabled={isSaving || !preferencesChanged}
                    className="w-full sm:w-fit"
                  >
                    <AsyncButtonContent
                      pending={isSaving}
                      idleLabel="Save Preferences"
                      pendingLabel="Saving..."
                    />
                  </Button>
                </FieldGroup>
              </form>
            )}
          </FieldGroup>
        </CardContent>
      </Card>

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
