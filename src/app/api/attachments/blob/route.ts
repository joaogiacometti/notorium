import { parseOwnedAttachmentPathname } from "@/features/attachments/pathname";
import { getOptionalSession } from "@/lib/auth/auth";
import { parseByteRangeHeader } from "@/lib/media-storage/byte-range";
import {
  getMediaStorageProvider,
  type ReadBlobResult,
} from "@/lib/media-storage/provider";

export async function GET(request: Request): Promise<Response> {
  const session = await getOptionalSession();
  if (!session) {
    return new Response(null, { status: 401 });
  }

  const url = new URL(request.url);
  const pathname = url.searchParams.get("pathname") ?? "";
  const parsedPath = parseOwnedAttachmentPathname(pathname);

  if (!parsedPath) {
    return new Response(null, { status: 400 });
  }

  if (parsedPath.ownerId !== session.user.id) {
    return new Response(null, { status: 403 });
  }

  const provider = await getMediaStorageProvider();
  if (!provider) {
    return new Response(null, { status: 503 });
  }

  try {
    const blob = await provider.readBlob({
      pathname: parsedPath.pathname,
      range: parseByteRangeHeader(request.headers.get("range")) ?? undefined,
    });

    if (!blob) {
      return new Response(null, { status: 404 });
    }

    return new Response(blob.stream, {
      status: blob.contentRange ? 206 : 200,
      headers: buildBlobResponseHeaders(blob),
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}

// `accept-ranges` lets pdf.js switch to partial reads, so a large PDF loads
// only the pages being viewed instead of the whole file.
function buildBlobResponseHeaders(blob: ReadBlobResult): Headers {
  const headers = new Headers();
  headers.set("content-type", blob.contentType);
  headers.set("content-disposition", blob.contentDisposition);
  headers.set("cache-control", blob.cacheControl);
  headers.set("etag", blob.etag);
  headers.set("content-length", String(blob.size));
  headers.set("accept-ranges", "bytes");
  if (blob.contentRange) {
    headers.set("content-range", blob.contentRange);
  }
  return headers;
}
