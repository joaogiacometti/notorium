import { Shield } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { UserAccessManagementCard } from "@/components/user-access-management-card";
import { getManagedUsers } from "@/lib/access-control";
import { requireAdminSession } from "@/lib/auth";

export default async function AdminPage() {
  const session = await requireAdminSession();
  const t = await getTranslations("AdminPage");
  const managedUsers = await getManagedUsers(session.user.id);

  return (
    <main>
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-10 flex min-w-0 items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Shield className="size-5" />
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
        <UserAccessManagementCard users={managedUsers} />
      </div>
    </main>
  );
}
