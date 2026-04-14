"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Bell } from "lucide-react";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { updateNotificationPreferences } from "@/app/actions/account";
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
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-primary/10 p-2 text-primary">
            <Bell className="size-4" />
          </div>
          <div className="space-y-2">
            <CardTitle>Email Notifications</CardTitle>
            <CardDescription>
              Get a daily email reminder when assessments are approaching their
              due date.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form
          id="form-account-notifications"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <FieldGroup className="gap-6">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <Label htmlFor="notifications-enabled-toggle">
                  Enable reminders
                </Label>
                <FieldDescription>
                  Receive an email when pending assessments are near their due
                  date.
                </FieldDescription>
              </div>
              <Controller
                name="notificationsEnabled"
                control={form.control}
                render={({ field }) => (
                  <Switch
                    id="notifications-enabled-toggle"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>

            {notificationsEnabled && (
              <div className="space-y-2">
                <Label htmlFor="notifications-days-before-select">
                  Remind me
                </Label>
                <Controller
                  name="notificationDaysBefore"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        id="notifications-days-before-select"
                        className="w-full sm:w-60"
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
                <FieldDescription>
                  You will receive one email per day while assessments fall
                  within this window.
                </FieldDescription>
              </div>
            )}

            <Button
              type="submit"
              form="form-account-notifications"
              disabled={isPending || !form.formState.isDirty}
              className="w-full sm:w-fit"
            >
              <AsyncButtonContent
                pending={isPending}
                idleLabel="Save Preferences"
                pendingLabel="Saving..."
              />
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
