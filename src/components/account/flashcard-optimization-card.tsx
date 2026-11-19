"use client";

import { useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  optimizeFlashcardScheduler,
  resetFlashcardSchedulerOptimization,
  updateFsrsOptimizationPreferences,
} from "@/app/actions/account";
import { SettingsCard } from "@/components/account/settings-section";
import { ActionConfirmationDialog } from "@/components/shared/action-confirmation-dialog";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { invalidateAccountSettings } from "@/lib/client-cache/invalidation";
import type { AccountSettings } from "@/lib/server/api-contracts";
import { resolveActionErrorMessage } from "@/lib/server/server-action-errors";

interface FlashcardOptimizationCardProps {
  settings: AccountSettings["fsrsOptimization"];
}

export function FlashcardOptimizationCard({
  settings,
}: Readonly<FlashcardOptimizationCardProps>) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [resetOpen, setResetOpen] = useState(false);
  const [isOptimizing, startOptimization] = useTransition();
  const [isResetting, startReset] = useTransition();
  const [isSaving, startSaving] = useTransition();
  // Mirrors the saved value so the switch responds immediately; reverted if
  // the save fails.
  const [automaticEnabled, setAutomaticEnabled] = useState(
    settings.automaticOptimizationEnabled,
  );

  async function handleOptimizeNow() {
    startOptimization(async () => {
      const result = await optimizeFlashcardScheduler();
      if (result.success) {
        toast.success("Scheduler optimized.");
        router.refresh();
        await invalidateAccountSettings(queryClient);
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
        toast.success("Scheduler reset to defaults.");
        router.refresh();
        await invalidateAccountSettings(queryClient);
        return;
      }

      toast.error(resolveActionErrorMessage(result));
    });
  }

  function handleAutomaticChange(enabled: boolean) {
    setAutomaticEnabled(enabled);
    startSaving(async () => {
      const result = await updateFsrsOptimizationPreferences({
        automaticOptimizationEnabled: enabled,
      });
      if (result.success) {
        toast.success(
          enabled
            ? "Automatic optimization turned on."
            : "Automatic optimization turned off.",
        );
        router.refresh();
        await invalidateAccountSettings(queryClient);
        return;
      }

      setAutomaticEnabled(!enabled);
      toast.error(resolveActionErrorMessage(result));
    });
  }

  const busy = isOptimizing || isResetting;

  return (
    <>
      <SettingsCard
        title="Scheduler optimization"
        description="FSRS learns from your review history to predict when you'll forget each card."
        keywords="fsrs flashcard scheduler optimize review last optimized"
        control={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setResetOpen(true)}
              disabled={busy}
            >
              <RotateCcw />
              Reset to defaults
            </Button>
            <Button type="button" onClick={handleOptimizeNow} disabled={busy}>
              <AsyncButtonContent
                pending={isOptimizing}
                idleIcon={<Sparkles />}
                idleLabel="Optimize now"
                pendingLabel="Optimizing…"
              />
            </Button>
          </>
        }
      >
        <dl className="grid grid-cols-3 divide-x rounded-md border">
          <OptimizationStat
            label="Last optimized"
            value={settings.lastOptimizedOn ?? "Never"}
          />
          <OptimizationStat
            label="Reviews logged"
            value={settings.reviewCount}
          />
          <OptimizationStat
            label="Used in last run"
            value={settings.optimizedReviewCount}
          />
        </dl>
      </SettingsCard>

      <SettingsCard
        title="Automatic optimization"
        description="Re-optimize every 30 days when the scheduled workflow runs."
        keywords="fsrs flashcard scheduler auto"
        control={
          <Switch
            id="automatic-optimization-toggle"
            aria-label="Automatic optimization"
            checked={automaticEnabled}
            onCheckedChange={handleAutomaticChange}
            disabled={isSaving}
          />
        }
      />

      <ActionConfirmationDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reset to defaults"
        description="Resetting will discard the current optimized FSRS tuning and restore the default scheduler. Your review history and flashcard progress will be kept."
        confirmLabel="Reset to defaults"
        pendingLabel="Resetting…"
        confirmVariant="destructive"
        isPending={isResetting}
        onConfirm={handleReset}
      />
    </>
  );
}

function OptimizationStat({
  label,
  value,
}: Readonly<{ label: string; value: string | number }>) {
  return (
    <div className="min-w-0 px-3.5 py-2.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
