import { redirect } from "next/navigation";
import { BookReader } from "@/components/library/book-reader";
import { getBookByIdForUser } from "@/features/library/queries";
import { getAnnotationsForBook } from "@/features/library-annotations/queries";
import { getAllSubjectsWithPathsForUser } from "@/features/subjects/queries";
import { getReaderColorMode } from "@/features/user/queries";
import { isAiEnabled } from "@/lib/ai/config";
import { requireSession } from "@/lib/auth/auth";
import { getBookDetailHref } from "@/lib/navigation/detail-page-back-link";

interface BookPageProps {
  params: Promise<{ id: string; bookId: string }>;
}

export default async function BookPage({ params }: Readonly<BookPageProps>) {
  const session = await requireSession();
  const { id, bookId } = await params;

  const [book, readerColorInverted, initialAnnotations, subjects] =
    await Promise.all([
      getBookByIdForUser(session.user.id, bookId),
      getReaderColorMode(session.user.id),
      getAnnotationsForBook(session.user.id, bookId),
      getAllSubjectsWithPathsForUser(session.user.id),
    ]);

  if (!book) {
    redirect(`/subjects/${id}`);
  }

  // The book moved to another subject since this URL was opened; send the reader
  // to its current home so the breadcrumb and back link stay correct.
  if (book.subjectId && book.subjectId !== id) {
    redirect(getBookDetailHref(book.subjectId, book.id));
  }

  return (
    <BookReader
      bookId={book.id}
      fileUrl={`/api/library/${book.id}`}
      title={book.title}
      initialPage={book.currentPage}
      initialZoomMobile={book.zoomMobile}
      initialZoomDesktop={book.zoomDesktop}
      readerColorInverted={readerColorInverted}
      initialAnnotations={initialAnnotations}
      aiEnabled={isAiEnabled()}
      subjects={subjects}
    />
  );
}
