import { FileText, Network } from "lucide-react";
import Link from "next/link";
import { DashboardCardHeader } from "@/components/home/dashboard-card-header";
import { Card, CardContent } from "@/components/ui/card";
import type { DocumentListItem } from "@/features/documents/types";
import { formatRelativeTime } from "@/lib/dates/format";
import { getDocumentDetailHref } from "@/lib/navigation/detail-page-back-link";

interface RecentDocumentsCardProps {
  documents: DocumentListItem[];
}

/**
 * Dashboard card listing the user's most recently updated notes and mindmaps
 * across every subject, each linking to its detail page.
 */
export function RecentDocumentsCard({
  documents,
}: Readonly<RecentDocumentsCardProps>) {
  return (
    <Card className="gap-3 py-4">
      <DashboardCardHeader icon={FileText} title="Recent documents" />
      <CardContent>
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Notes and mindmaps you edit will show up here.
          </p>
        ) : (
          <ul className="grid gap-2 gap-x-6 sm:grid-cols-2">
            {documents.map((document) => (
              <li key={`${document.kind}-${document.id}`}>
                <Link
                  href={getDocumentDetailHref(document)}
                  className="flex items-center gap-2 rounded-md text-sm text-muted-foreground hover:text-foreground"
                >
                  {document.kind === "note" ? (
                    <FileText className="size-4 shrink-0" />
                  ) : (
                    <Network className="size-4 shrink-0" />
                  )}
                  <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                    {document.title}
                  </span>
                  <span className="shrink-0 text-xs">
                    {formatRelativeTime(document.updatedAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
