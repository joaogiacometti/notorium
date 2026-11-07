import Link from "next/link";
import { DOCUMENT_KIND_ICONS } from "@/components/documents/document-kind-icons";
import { DashboardCardHeader } from "@/components/home/dashboard-card-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  DocumentKind,
  DocumentListItem,
} from "@/features/documents/types";
import { formatRelativeTime } from "@/lib/dates/format";
import { getDocumentDetailHref } from "@/lib/navigation/detail-page-back-link";

/** How many documents the Home dashboard lists. */
export const RECENT_DOCUMENTS_LIMIT = 6;

interface RecentDocumentsCardProps {
  documents: DocumentListItem[];
}

/**
 * Dashboard card listing the user's most recently updated notes and PDFs
 * across every folder, each linking to its detail page.
 */
export function RecentDocumentsCard({
  documents,
}: Readonly<RecentDocumentsCardProps>) {
  return (
    <Card className="gap-3 py-4">
      <DashboardCardHeader title="Recent documents" />
      <CardContent>
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Notes and PDFs you add will show up here.
          </p>
        ) : (
          <ul className="grid gap-1">
            {documents.map((document) => (
              <li key={`${document.kind}-${document.id}`}>
                <Link
                  href={getDocumentDetailHref(document)}
                  className="-mx-2 flex items-center gap-2 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                >
                  <DocumentKindIcon kind={document.kind} />
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

function DocumentKindIcon({ kind }: Readonly<{ kind: DocumentKind }>) {
  const Icon = DOCUMENT_KIND_ICONS[kind];
  return <Icon className="size-4 shrink-0" />;
}

/** Loading placeholder with {@link RecentDocumentsCard}'s full row height. */
export function RecentDocumentsCardSkeleton() {
  return (
    <Card className="gap-3 py-4">
      <CardHeader className="flex min-h-5 flex-row items-center gap-2 space-y-0">
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent>
        <div className="grid gap-1">
          {Array.from({ length: RECENT_DOCUMENTS_LIMIT }, (_, index) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton rows have no stable id
              key={index}
              className="flex h-7 items-center gap-2"
            >
              <Skeleton className="size-4 shrink-0" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-3 w-14 shrink-0" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
