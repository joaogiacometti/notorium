"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { updateNotificationPreferences } from "@/app/actions/account";
import {
  SettingsRow,
  SettingsSection,
} from "@/components/account/settings-section";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  type NotificationDaysBefore,
  notificationDaysBeforeValues,
  type UpdateNotificationPreferencesForm,
  updateNotificationPreferencesSchema,
} from "@/features/notifications/validation";
import { resolveActionErrorMessage } from "@/lib/server/server-action-errors";

const DAYS_BEFORE_LABELS: Record<NotificationDaysBefore, string> = {
  "1": "1 day before",
  "3": "3 days before",
  "7": "7 days before",
};

interface NotificationPreferencesCardProps {
  initialEnabled: boolean;
  initialDaysBefore: number;
}

function toSafeDaysBefore(value: number): NotificationDaysBefore {
  const asString = String(value);
  return (notificationDaysBeforeValues as readonly string[]).includes(asString)
    ? (asString as NotificationDaysBefore)
    : "1";
}

export function NotificationPreferencesCard({
  initialEnabled,
  initialDaysBefore,
}: Readonly<NotificationPreferencesCardProps>) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<UpdateNotificationPreferencesForm>({
    resolver: zodResolver(updateNotificationPreferencesSchema),
    defaultValues: {
      notificationsEnabled: initialEnabled,
      notificationDaysBefore: toSafeDaysBefore(initialDaysBefore),
    },
  });

  const notificationsEnabled = form.watch("notificationsEnabled");

  async function onSubmit(data: UpdateNotificationPreferencesForm) {
    startTransition(async () => {
      const result = await updateNotificationPreferences(data);
      if (result.success) {
        form.reset(data);
        toast.success("Notification preferences saved.");
        return;
      }
      toast.error(resolveActionErrorMessage(result));
    });
  }

  return (
    <form
      id="form-account-notifications"
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <SettingsSection title="Notifications">
        <SettingsRow
          label="Email reminders"
          description="Receive a daily email when pending assessments are near their due date."
          keywords="notifications assessment due"
          action={
            <Controller
              name="notificationsEnabled"
              control={form.control}
              render={({ field }) => (
                <Switch
                  id="notifications-enabled-toggle"
                  aria-label="Enable email reminders"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          }
        />

        {notificationsEnabled ? (
          <SettingsRow
            label="Lead time"
            description="How early to send the reminder."
            keywords="notifications email reminder days"
            action={
              <Controller
                name="notificationDaysBefore"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="notifications-days-before-select"
                      className="w-full sm:w-44"
                    >
                      <SelectValue placeholder="Select lead time" />
                    </SelectTrigger>
                    <SelectContent>
                      {notificationDaysBeforeValues.map((days) => (
                        <SelectItem key={days} value={days}>
                          {DAYS_BEFORE_LABELS[days]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            }
          />
        ) : null}

        <SettingsRow
          label="Save changes"
          description="Apply your reminder preferences."
          keywords="notifications email reminder lead time"
          action={
            <Button
              type="submit"
              form="form-account-notifications"
              disabled={isPending || !form.formState.isDirty}
              className="w-full sm:w-fit"
            >
              <AsyncButtonContent
                pending={isPending}
                idleLabel="Save"
                pendingLabel="Saving..."
              />
            </Button>
          }
        />
      </SettingsSection>
    </form>
  );
}
