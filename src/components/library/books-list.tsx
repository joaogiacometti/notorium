"use client";

import { BookOpen, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AddBookDialog } from "@/components/library/add-book-dialog";
import { BulkDeleteBooksDialog } from "@/components/library/bulk-delete-books-dialog";
import { DeleteBookDialog } from "@/components/library/delete-book-dialog";
import { EditBookDialog } from "@/components/library/edit-book-dialog";
import {
  getColumnClassName,
  getVisibleBooks,
} from "@/components/library/library-list-utils";
import { LibrarySelectionToolbar } from "@/components/library/library-selection-toolbar";
import { getLibraryColumns } from "@/components/library/library-table-columns";
import { ManagerDataTable } from "@/components/shared/manager-data-table";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PAGE_SIZE_OPTIONS } from "@/lib/pagination/page-size";
import type { LibraryBookEntity } from "@/lib/server/api-contracts";
import { cn } from "@/lib/utils";

interface BooksListProps {
  books: LibraryBookEntity[];
}

type BookActionTarget = {
  action: "edit" | "delete";
  book: { id: string; title: string; author: string | null };
};

export function BooksList({ books }: Readonly<BooksListProps>) {
  const router = useRouter();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
  const [activeAction, setActiveAction] = useState<BookActionTarget | null>(
    null,
  );
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const visibleBooks = getVisibleBooks(books, searchQuery);
  const pageCount = Math.max(1, Math.ceil(visibleBooks.length / pageSize));
  const pageBooks = visibleBooks.slice(
    pageIndex * pageSize,
    pageIndex * pageSize + pageSize,
  );

  useEffect(() => {
    setPageIndex((currentPageIndex) =>
      Math.min(currentPageIndex, pageCount - 1),
    );
  }, [pageCount]);

  useEffect(() => {
    const visibleBookIds = new Set(visibleBooks.map((book) => book.id));

    setSelectedBookIds((currentIds) => {
      const nextIds = currentIds.filter((id) => visibleBookIds.has(id));

      return nextIds.length === currentIds.length ? currentIds : nextIds;
    });
  }, [visibleBooks]);

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    setPageIndex(0);
  }

  const columns = getLibraryColumns({
    onEdit: (book) =>
      setActiveAction({
        action: "edit",
        book: { id: book.id, title: book.title, author: book.author },
      }),
    onDelete: (book) =>
      setActiveAction({
        action: "delete",
        book: { id: book.id, title: book.title, author: book.author },
      }),
    hasSelection: selectedBookIds.length > 0,
  });

  return (
    <TooltipProvider>
      <div className="flex min-w-0 flex-col gap-3 lg:h-full lg:min-h-0">
        <Card className="relative overflow-hidden border-border/70 bg-linear-to-br from-card via-card to-primary/5 py-0 shadow-none">
          <CardContent className="relative px-4 py-3 sm:px-5 sm:py-4">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1 sm:max-w-3xl">
                  <div className="relative min-w-0">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(event) =>
                        handleSearchChange(event.target.value)
                      }
                      placeholder="Search books..."
                      className="h-10 rounded-lg border-border/70 bg-background/80 pl-10 shadow-xs"
                    />
                  </div>
                </div>
                <AddBookDialog />
              </div>
              <LibrarySelectionToolbar
                total={visibleBooks.length}
                selectedCount={selectedBookIds.length}
                onDelete={() => setBulkDeleteOpen(true)}
                onClearSelection={() => setSelectedBookIds([])}
              />
            </div>
          </CardContent>
        </Card>

        {books.length === 0 ? (
          <EmptyLibrary />
        ) : (
          <Card className="h-[clamp(22rem,58svh,36rem)] min-w-0 overflow-hidden border-border/70 bg-card/85 py-0 shadow-none lg:h-auto lg:min-h-0 lg:flex-1">
            <ManagerDataTable
              data={pageBooks}
              columns={columns}
              emptyLabel="No books match your search."
              getRowId={(book) => book.id}
              getRowAriaLabel={(book) => `Open ${book.title}`}
              onRowClick={(book) => router.push(`/library/${book.id}`)}
              exposeRowNavigationRole={false}
              onPageIndexChange={setPageIndex}
              onPageSizeChange={(nextPageSize) => {
                setPageSize(nextPageSize);
                setPageIndex(0);
              }}
              pageIndex={pageIndex}
              pageCount={pageCount}
              pageSize={pageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              pageSizeLabel="Rows"
              pageLabel={(current, total) => `Page ${current} of ${total}`}
              prevLabel="Previous"
              nextLabel="Next"
              selectedRowIds={selectedBookIds}
              onSelectedRowIdsChange={setSelectedBookIds}
              selectionAriaLabel="Select book"
              tableClassName="w-full min-w-0 sm:min-w-[28rem] lg:min-w-[20rem]"
              columnResizeMode="onEnd"
              scrollAreaClassName="min-w-0 overflow-x-auto overflow-y-auto"
              getHeaderCellClassName={getColumnClassName}
              getBodyCellClassName={(columnId) =>
                cn(
                  "px-3 py-2.5 align-middle sm:py-3",
                  getColumnClassName(columnId),
                )
              }
              wrapperClassName="min-w-0"
            />
          </Card>
        )}

        {activeAction?.action === "edit" ? (
          <EditBookDialog
            book={activeAction.book}
            open
            onOpenChange={(open) => {
              if (!open) setActiveAction(null);
            }}
          />
        ) : null}
        {activeAction?.action === "delete" ? (
          <DeleteBookDialog
            bookId={activeAction.book.id}
            bookTitle={activeAction.book.title}
            open
            onOpenChange={(open) => {
              if (!open) setActiveAction(null);
            }}
          />
        ) : null}
        <BulkDeleteBooksDialog
          ids={selectedBookIds}
          open={bulkDeleteOpen}
          onOpenChange={setBulkDeleteOpen}
          onDeleted={(ids) =>
            setSelectedBookIds((currentIds) =>
              currentIds.filter((id) => !ids.includes(id)),
            )
          }
        />
      </div>
    </TooltipProvider>
  );
}

function EmptyLibrary() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 px-6 py-20 text-center lg:min-h-0 lg:flex-1">
      <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <BookOpen className="size-6" />
      </div>
      <h2 className="mb-1 text-lg font-semibold">No books yet</h2>
      <p className="mb-6 max-w-sm text-center text-sm text-muted-foreground">
        Add a PDF to start reading and pick up where you left off.
      </p>
      <AddBookDialog />
    </div>
  );
}
