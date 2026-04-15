import { UserCircle } from "lucide-react";
import { AccountForm } from "@/components/account/account-form";
import type { AccountSectionNavItem } from "@/components/account/account-sections-nav";
import { AccountSectionsNav } from "@/components/account/account-sections-nav";
import { AppPageContainer } from "@/components/shared/app-page-container";
import { getServerEnv } from "@/env";
import { getUserAiSettingsSummary } from "@/features/ai/queries";
import { getNotificationPreferences } from "@/features/user/queries";
import { requireSession } from "@/lib/auth/auth";

export default async function AccountPage() {
  const session = await requireSession();
  const emailEnabled = !!getServerEnv().RESEND_API_KEY;
  const sectionItems: AccountSectionNavItem[] = [
    { id: "account", label: "Account" },
    { id: "ai-settings", label: "AI settings" },
    ...(emailEnabled ? [{ id: "notifications", label: "Notifications" }] : []),
    { id: "danger-zone", label: "Danger zone", tone: "danger" },
  ];

  const aiSettings = await getUserAiSettingsSummary(session.user.id);
  const notificationPrefs = emailEnabled
    ? await getNotificationPreferences(session.user.id)
    : null;

  return (
    <main>
      <AppPageContainer maxWidth="5xl">
        <div className="mb-6 flex min-w-0 items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UserCircle className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="wrap-break-word hyphens-auto text-2xl font-bold tracking-tight">
              Manage Account
            </h1>
            <p className="mt-1.5 wrap-break-word hyphens-auto text-sm text-muted-foreground">
              Review your account information and manage your settings.
            </p>
          </div>
        </div>
        <div className="grid items-start gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <AccountSectionsNav
            items={sectionItems}
            className="lg:sticky lg:top-20"
          />
          <div className="space-y-4">
            <AccountForm
              name={session.user.name}
              email={session.user.email}
              createdAt={new Date(session.user.createdAt).toISOString()}
              updatedAt={new Date(session.user.updatedAt).toISOString()}
              initialAiSettings={aiSettings}
              emailEnabled={emailEnabled}
              initialNotificationsEnabled={
                notificationPrefs?.notificationsEnabled ?? false
              }
              initialNotificationDaysBefore={
                notificationPrefs?.notificationDaysBefore ?? 1
              }
            />
          </div>
        </div>
      </AppPageContainer>
    </main>
  );
}
