import { PageHeader } from "@/components/shared/page-header";

/** Static header shared by the admin page and its loading state. */
export function AdminPageHeader() {
  return (
    <PageHeader
      title="Admin panel"
      description="Manage user access and approval states."
    />
  );
}
