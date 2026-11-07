import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { UserAccessManagementCard } from "@/components/admin/user-access-management-card";
import { DetailPageLayout } from "@/components/shared/detail-page-layout";
import { getManagedUsers } from "@/lib/auth/access-control";
import { requireAdminSession } from "@/lib/auth/auth";

export default async function AdminPage() {
  const session = await requireAdminSession();
  const managedUsers = await getManagedUsers(session.user.id);

  return (
    <main>
      <DetailPageLayout
        breadcrumb={{ current: { label: "Admin", icon: "shield" } }}
        maxWidth="3xl"
      >
        <AdminPageHeader />
        <UserAccessManagementCard users={managedUsers} />
      </DetailPageLayout>
    </main>
  );
}
