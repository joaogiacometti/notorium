import { uploadAttachmentImageForUser } from "@/features/attachments/mutations";
import { isUploadImageContext } from "@/features/attachments/validation";
import { getOptionalSession } from "@/lib/auth/auth";
import { actionError } from "@/lib/server/server-action-errors";

// Image uploads run through this route handler rather than a Server Action:
// Server Actions cap request bodies at 1 MB (and raising that past Vercel's
// 4.5 MB function-body ceiling is impossible), while multipart FormData here
// carries raw binary with no base64 inflation. This is the one sanctioned
// client-callable write endpoint outside Server Actions; see CLAUDE.md and
// docs/architecture.md. It stays thin: authenticate, validate, delegate to the
// shared upload core, and return the same typed result shape Server Actions use.
export async function POST(request: Request): Promise<Response> {
  const session = await getOptionalSession();

  if (!session) {
    return Response.json(actionError("auth.forbidden"), { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json(actionError("attachments.invalidData"), {
      status: 400,
    });
  }

  const file = form.get("file");
  const context = form.get("context");

  if (
    !(file instanceof File) ||
    typeof context !== "string" ||
    !isUploadImageContext(context)
  ) {
    return Response.json(actionError("attachments.invalidData"), {
      status: 400,
    });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const result = await uploadAttachmentImageForUser(session.user.id, {
    fileName: file.name,
    mimeType: file.type,
    bytes,
    context,
  });

  return Response.json(result, { status: result.success ? 200 : 400 });
}
