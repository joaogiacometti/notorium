import { getBookByIdForUser } from "@/features/library/queries";
import { getOptionalSession } from "@/lib/auth/auth";
import { getMediaStorageProvider } from "@/lib/media-storage/provider";

interface LibraryBookRouteContext {
  params: Promise<{ id: string }>;
}

// Inline (not attachment) so the browser renders the PDF in the reader instead
// of triggering a download. Uses filename* (RFC 5987) to support non-ASCII
// characters such as curly quotes or accented letters in filenames.
function getInlineContentDisposition(fileName: string): string {
  const encoded = encodeURIComponent(fileName);
  return `inline; filename*=UTF-8''${encoded}`;
}

export async function GET(
  _request: Request,
  context: LibraryBookRouteContext,
): Promise<Response> {
  const session = await getOptionalSession();
  if (!session) {
    return new Response(null, { status: 401 });
  }

  const { id } = await context.params;
  const bookId = id.trim();

  if (bookId.length === 0) {
    return new Response(null, { status: 400 });
  }

  const book = await getBookByIdForUser(session.user.id, bookId);

  if (!book) {
    return new Response(null, { status: 404 });
  }

  const provider = await getMediaStorageProvider();
  if (!provider) {
    return new Response(null, { status: 503 });
  }

  try {
    const file = await provider.readFile({ pathname: book.blobPathname });

    if (!file) {
      return new Response(null, { status: 404 });
    }

    const headers = new Headers();
    headers.set("content-type", "application/pdf");
    headers.set(
      "content-disposition",
      getInlineContentDisposition(book.fileName),
    );
    headers.set("cache-control", "private, max-age=0, must-revalidate");
    headers.set("etag", file.etag);
    headers.set("content-length", String(file.size));

    return new Response(file.stream, { status: 200, headers });
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "library.readFile.failed",
        bookId,
        error: String(error),
      }),
    );
    return new Response(null, { status: 502 });
  }
}
