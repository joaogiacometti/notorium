import { Shield } from "lucide-react";
import { UserAccessManagementCard } from "@/components/admin/user-access-management-card";
import { AppPageContainer } from "@/components/shared/app-page-container";
import { getManagedUsers } from "@/lib/auth/access-control";
import { requireAdminSession } from "@/lib/auth/auth";

export default async function AdminPage() {
  const session = await requireAdminSession();
  const managedUsers = await getManagedUsers(session.user.id);

  return (
    <main>
      <AppPageContainer maxWidth="3xl">
        <div className="mb-6 flex min-w-0 items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Shield className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="wrap-break-word hyphens-auto text-2xl font-bold tracking-tight">
              Admin Panel
            </h1>
            <p className="mt-1.5 wrap-break-word hyphens-auto text-sm text-muted-foreground">
              Manage user access and approval states.
            </p>
          </div>
        </div>
        <UserAccessManagementCard users={managedUsers} />
      </AppPageContainer>
    </main>
  );
}
