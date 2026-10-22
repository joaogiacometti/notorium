import { uploadAttachmentImageForUser } from "@/features/attachments/mutations";
import { isUploadImageContext } from "@/features/attachments/validation";
import {
  readUploadForm,
  UploadBodyTooLargeError,
} from "@/lib/attachments/read-upload-form";
import { getOptionalSession } from "@/lib/auth/auth";
import { LIMITS } from "@/lib/config/limits";
import { consumeUserDailyRateLimit } from "@/lib/rate-limit/user-rate-limit";
import { actionError } from "@/lib/server/server-action-errors";

// Image uploads run through this route handler rather than a Server Action:
// Server Actions cap request bodies at 1 MB (and raising that past Vercel's
// 4.5 MB function-body ceiling is impossible), while multipart FormData here
// carries raw binary with no base64 inflation. This is the one sanctioned
// client-callable write endpoint outside Server Actions; see AGENTS.md and
// docs/architecture.md. It stays thin: authenticate, validate, delegate to the
// shared upload core, and return the same typed result shape Server Actions use.
export async function POST(request: Request): Promise<Response> {
  const session = await getOptionalSession();

  if (!session) {
    return Response.json(actionError("auth.forbidden"), { status: 401 });
  }

  const quota = await consumeUserDailyRateLimit({
    prefix: LIMITS.attachmentUploadRateLimitPrefix,
    userId: session.user.id,
    limit: LIMITS.attachmentUploadRateLimitPerDay,
    errorCode: "auth.rateLimited",
  });
  if (quota.limited) {
    return Response.json(actionError(quota.errorCode), { status: 429 });
  }

  let form: FormData;
  try {
    form = await readUploadForm(request);
  } catch (error) {
    if (error instanceof UploadBodyTooLargeError) return uploadSizeError();
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

  if (file.size > LIMITS.attachmentMaxBytes) return uploadSizeError();

  const bytes = new Uint8Array(await file.arrayBuffer());
  const result = await uploadAttachmentImageForUser(session.user.id, {
    fileName: file.name,
    mimeType: file.type,
    bytes,
    context,
  });

  return Response.json(result, { status: result.success ? 200 : 400 });
}

function uploadSizeError(): Response {
  return Response.json(
    actionError("limits.attachmentSizeLimit", {
      errorParams: { max: LIMITS.attachmentMaxBytes },
    }),
    { status: 413 },
  );
}
