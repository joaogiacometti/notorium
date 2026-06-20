import { BookMarked } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/dates/format";
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
      <CardHeader>
        <CardTitle className="text-base">Recent books</CardTitle>
      </CardHeader>
      <CardContent>
        {books.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Books you add to your library will show up here.
          </p>
        ) : (
          <ul className="grid gap-2 gap-x-6 sm:grid-cols-2">
            {books.map((book) => (
              <li key={book.id}>
                <Link
                  href={`/library/${book.id}`}
                  className="flex items-center gap-2 rounded-md text-sm text-muted-foreground hover:text-foreground"
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
