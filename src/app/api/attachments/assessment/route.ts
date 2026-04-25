import { getAssessmentAttachmentForUser } from "@/features/attachments/queries";
import { getOptionalSession } from "@/lib/auth/auth";
import { getMediaStorageProvider } from "@/lib/media-storage/provider";

function getDownloadContentDisposition(fileName: string): string {
  const safeFileName = fileName.replaceAll(/["\r\n]/g, "_");
  return `attachment; filename="${safeFileName}"`;
}

export async function GET(request: Request): Promise<Response> {
  const session = await getOptionalSession();
  if (!session) {
    return new Response(null, { status: 401 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id")?.trim() ?? "";

  if (id.length === 0) {
    return new Response(null, { status: 400 });
  }

  const attachment = await getAssessmentAttachmentForUser(session.user.id, id);

  if (!attachment) {
    return new Response(null, { status: 404 });
  }

  const provider = await getMediaStorageProvider();
  if (!provider) {
    return new Response(null, { status: 503 });
  }

  try {
    const file = await provider.readFile({
      pathname: attachment.blobPathname,
    });

    if (!file) {
      return new Response(null, { status: 404 });
    }

    const headers = new Headers();
    headers.set("content-type", attachment.mimeType);
    headers.set(
      "content-disposition",
      getDownloadContentDisposition(attachment.fileName),
    );
    headers.set("cache-control", "private, max-age=0, must-revalidate");
    headers.set("etag", file.etag);
    headers.set("content-length", String(file.size));

    return new Response(file.stream, {
      status: 200,
      headers,
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
