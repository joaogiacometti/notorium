import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DetailPageLayout } from "@/components/shared/detail-page-layout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <main>
      <DetailPageLayout
        breadcrumb={{ current: { label: "Admin", icon: "shield" } }}
        maxWidth="3xl"
      >
        <AdminPageHeader />
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_8.5rem] lg:max-w-xl">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
            <div className="space-y-px overflow-hidden rounded-md border">
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton
                  // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton rows have no stable id
                  key={index}
                  className="h-10 w-full rounded-none"
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </DetailPageLayout>
    </main>
  );
}
