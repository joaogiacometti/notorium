import { parseOwnedAttachmentPathname } from "@/features/attachments/pathname";
import { getOptionalSession } from "@/lib/auth/auth";
import { getMediaStorageProvider } from "@/lib/media-storage/provider";

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
    const image = await provider.readImage({ pathname: parsedPath.pathname });

    if (!image) {
      return new Response(null, { status: 404 });
    }

    const headers = new Headers();
    headers.set("content-type", image.contentType);
    headers.set("content-disposition", image.contentDisposition);
    headers.set("cache-control", image.cacheControl);
    headers.set("etag", image.etag);
    headers.set("content-length", String(image.size));

    return new Response(image.stream, {
      status: 200,
      headers,
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
