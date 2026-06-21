import { BookMarked } from "lucide-react";
import Link from "next/link";
import { DashboardCardHeader } from "@/components/home/dashboard-card-header";
import { Card, CardContent } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/dates/format";
import { getBookDetailHref } from "@/lib/navigation/detail-page-back-link";
import type { LibraryBookEntity } from "@/lib/server/api-contracts";

interface RecentBooksCardProps {
  books: LibraryBookEntity[];
}

/**
 * Dashboard card listing the user's most recently opened library books, each
 * linking to its reader so they can pick up where they left off.
 */
export function RecentBooksCard({ books }: Readonly<RecentBooksCardProps>) {
  return (
    <Card className="gap-3 py-4">
      <DashboardCardHeader icon={BookMarked} title="Recent books" />
      <CardContent>
        {books.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Books you add to your library will show up here.
          </p>
        ) : (
          <ul className="grid gap-1">
            {books.map((book) => (
              <li key={book.id} className="min-w-0">
                <Link
                  href={
                    book.subjectId
                      ? getBookDetailHref(book.subjectId, book.id)
                      : "/"
                  }
                  className="-mx-2 flex min-w-0 items-center gap-2 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                >
                  <BookMarked className="size-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                    {book.title}
                  </span>
                  <span className="shrink-0 text-xs">
                    {formatRelativeTime(book.updatedAt)}
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
