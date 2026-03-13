import { UserCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { AccountForm } from "@/components/account/account-form";
import { AppPageContainer } from "@/components/shared/app-page-container";
import { getUserAiSettingsSummary } from "@/features/ai/settings";
import { requireSession } from "@/lib/auth/auth";

export default async function AccountPage() {
  const session = await requireSession();
  const aiSettings = await getUserAiSettingsSummary(session.user.id);
  const t = await getTranslations("AccountPage");

  return (
    <main>
      <AppPageContainer maxWidth="3xl">
        <div className="mb-6 flex min-w-0 items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UserCircle className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="wrap-break-word hyphens-auto text-2xl font-bold tracking-tight">
              {t("title")}
            </h1>
            <p className="mt-1.5 wrap-break-word hyphens-auto text-sm text-muted-foreground">
              {t("description")}
            </p>
          </div>
        </div>
        <div className="space-y-6">
          <AccountForm
            name={session.user.name}
            email={session.user.email}
            createdAt={new Date(session.user.createdAt).toISOString()}
            updatedAt={new Date(session.user.updatedAt).toISOString()}
            initialAiSettings={aiSettings}
          />
        </div>
      </AppPageContainer>
    </main>
  );
}
