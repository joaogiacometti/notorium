import { get } from "@vercel/blob";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { noteImageAttachment } from "@/db/schema";
import { appEnv } from "@/env";
import { auth } from "@/lib/auth";

interface NoteImageAttachmentRouteProps {
  params: Promise<{ noteId: string; attachmentId: string }>;
}

export async function GET(
  request: Request,
  { params }: NoteImageAttachmentRouteProps,
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const blobToken = appEnv.BLOB_READ_WRITE_TOKEN;

  if (!blobToken) {
    return NextResponse.json(
      { error: "Blob storage is not configured." },
      { status: 500 },
    );
  }

  const { noteId, attachmentId } = await params;

  const existing = await db
    .select()
    .from(noteImageAttachment)
    .where(
      and(
        eq(noteImageAttachment.id, attachmentId),
        eq(noteImageAttachment.noteId, noteId),
        eq(noteImageAttachment.userId, session.user.id),
      ),
    );

  const attachment = existing[0];

  if (!attachment) {
    return NextResponse.json(
      { error: "Attachment not found." },
      { status: 404 },
    );
  }

  const blob = await get(attachment.blobPathname, {
    access: "private",
    ifNoneMatch: request.headers.get("if-none-match") ?? undefined,
    token: blobToken,
  });

  if (!blob) {
    return NextResponse.json(
      { error: "Attachment not found." },
      { status: 404 },
    );
  }

  if (blob.statusCode === 304) {
    const notModified = new NextResponse(null, { status: 304 });
    notModified.headers.set(
      "Cache-Control",
      "private, max-age=0, must-revalidate",
    );
    notModified.headers.set("ETag", blob.blob.etag);
    return notModified;
  }

  const response = new NextResponse(blob.stream, { status: 200 });
  response.headers.set("Cache-Control", "private, max-age=0, must-revalidate");
  response.headers.set("Content-Disposition", blob.blob.contentDisposition);
  response.headers.set("Content-Length", blob.blob.size.toString());
  response.headers.set("Content-Type", blob.blob.contentType);
  response.headers.set("ETag", blob.blob.etag);

  return response;
}
