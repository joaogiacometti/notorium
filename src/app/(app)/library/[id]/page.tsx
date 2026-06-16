import { notFound } from "next/navigation";
import { BookReader } from "@/components/library/book-reader";
import { getBookByIdForUser } from "@/features/library/queries";
import { requireSession } from "@/lib/auth/auth";

interface LibraryBookPageProps {
  params: Promise<{ id: string }>;
}

export default async function LibraryBookPage({
  params,
}: Readonly<LibraryBookPageProps>) {
  const session = await requireSession();
  const { id } = await params;
  const book = await getBookByIdForUser(session.user.id, id);

  if (!book) {
    notFound();
  }

  return (
    <BookReader
      bookId={book.id}
      fileUrl={`/api/library/${book.id}`}
      title={book.title}
      initialPage={book.currentPage}
    />
  );
}
