import { notFound } from "next/navigation";
import { BookReader } from "@/components/library/book-reader";
import { getBookByIdForUser } from "@/features/library/queries";
import { getAnnotationsForBook } from "@/features/library-annotations/queries";
import { getAllSubjectsWithPathsForUser } from "@/features/subjects/queries";
import { getReaderColorMode } from "@/features/user/queries";
import { isAiEnabled } from "@/lib/ai/config";
import { requireSession } from "@/lib/auth/auth";

interface LibraryBookPageProps {
  params: Promise<{ id: string }>;
}

export default async function LibraryBookPage({
  params,
}: Readonly<LibraryBookPageProps>) {
  const session = await requireSession();
  const { id } = await params;
  const [book, readerColorInverted, initialAnnotations, subjects] =
    await Promise.all([
      getBookByIdForUser(session.user.id, id),
      getReaderColorMode(session.user.id),
      getAnnotationsForBook(session.user.id, id),
      getAllSubjectsWithPathsForUser(session.user.id),
    ]);

  if (!book) {
    notFound();
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
