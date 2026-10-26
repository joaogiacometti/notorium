import { UserAccessManagementCard } from "@/components/admin/user-access-management-card";
import { DetailPageLayout } from "@/components/shared/detail-page-layout";
import { PageHeader } from "@/components/shared/page-header";
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
        <PageHeader
          title="Admin Panel"
          description="Manage user access and approval states."
        />
        <UserAccessManagementCard users={managedUsers} />
      </DetailPageLayout>
    </main>
  );
}
