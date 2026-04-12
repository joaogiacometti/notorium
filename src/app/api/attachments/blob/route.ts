import { getOptionalSession } from "@/lib/auth/auth";
import { getMediaStorageProvider } from "@/lib/media-storage/provider";

function parseOwnedPathname(
  pathnameParam: string,
): { ownerId: string; pathname: string } | null {
  const pathname = pathnameParam.trim();

  if (
    pathname.length === 0 ||
    pathname.length > 512 ||
    pathname.includes("..")
  ) {
    return null;
  }

  const segments = pathname.split("/");
  if (segments.length !== 4) {
    return null;
  }

  const [namespace, context, ownerId, fileName] = segments;

  if (namespace !== "notorium") {
    return null;
  }

  if (context !== "notes" && context !== "flashcards") {
    return null;
  }

  if (ownerId.length === 0 || ownerId.length > 200) {
    return null;
  }

  if (fileName.length === 0 || fileName.length > 220) {
    return null;
  }

  return { ownerId, pathname };
}

export async function GET(request: Request): Promise<Response> {
  const session = await getOptionalSession();
  if (!session) {
    return new Response(null, { status: 401 });
  }

  const url = new URL(request.url);
  const pathname = url.searchParams.get("pathname") ?? "";
  const parsedPath = parseOwnedPathname(pathname);

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
