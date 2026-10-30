import { getDb } from "@/db/index";
import { pdfDocument } from "@/db/schema";
import { parseOwnedAttachmentPathname } from "@/features/attachments/pathname";
import { checkDocumentSubjectCapacity } from "@/features/documents/move-target";
import { pdfCapacityRule } from "@/features/pdfs/capacity";
import type {
  CreatePdfResult,
  PreparePdfUploadResult,
} from "@/features/pdfs/types";
import {
  type CreatePdfForm,
  PDF_MIME_TYPE,
  type PreparePdfUploadForm,
} from "@/features/pdfs/validation";
import { LIMITS } from "@/lib/config/limits";
import {
  getMediaStorageProvider,
  type MediaStorageProvider,
  type StoredBlobHead,
} from "@/lib/media-storage/provider";
import { buildMediaStoragePathname } from "@/lib/media-storage/storage-pathname";
import { consumeUserDailyRateLimit } from "@/lib/rate-limit/user-rate-limit";
import {
  type ActionErrorResult,
  actionError,
} from "@/lib/server/server-action-errors";

function pdfSizeLimitError(): ActionErrorResult {
  return actionError("limits.pdfSizeLimit", {
    errorParams: { maxMb: LIMITS.pdfMaxMegabytes },
  });
}

/**
 * Issues a one-file client upload token for a pathname the server chooses
 * under the user's `pdfs` prefix. The browser then uploads straight to media
 * storage, which enforces the size and type baked into the token.
 *
 * @example
 * await preparePdfUploadForUser(userId, { subjectId, fileName: "book.pdf", sizeBytes });
 */
export async function preparePdfUploadForUser(
  userId: string,
  data: PreparePdfUploadForm,
): Promise<PreparePdfUploadResult> {
  if (data.sizeBytes > LIMITS.pdfMaxBytes) {
    return pdfSizeLimitError();
  }

  const capacityError = await checkDocumentSubjectCapacity(
    userId,
    data.subjectId,
    pdfCapacityRule,
  );
  if (capacityError) {
    return capacityError;
  }

  const provider = await getMediaStorageProvider();
  if (!provider) {
    return actionError("attachments.notConfigured");
  }

  const quotaError = await consumePdfUploadQuota(userId);
  if (quotaError) {
    return quotaError;
  }

  return issuePdfUploadToken(provider, userId, data.fileName);
}

async function consumePdfUploadQuota(
  userId: string,
): Promise<ActionErrorResult | null> {
  const quota = await consumeUserDailyRateLimit({
    prefix: LIMITS.pdfUploadRateLimitPrefix,
    userId,
    limit: LIMITS.pdfUploadRateLimitPerDay,
    errorCode: "limits.pdfUploadsPerDay",
  });

  return quota.limited ? actionError(quota.errorCode) : null;
}

async function issuePdfUploadToken(
  provider: MediaStorageProvider,
  userId: string,
  fileName: string,
): Promise<PreparePdfUploadResult> {
  const pathname = buildMediaStoragePathname({
    userId,
    context: "pdfs",
    fileName,
    fallbackFileName: "document.pdf",
  });
  const clientToken = await provider.createClientUploadToken({
    pathname,
    maximumSizeInBytes: LIMITS.pdfMaxBytes,
    allowedContentTypes: [PDF_MIME_TYPE],
  });

  return { success: true, pathname, clientToken };
}

/**
 * Registers an uploaded PDF as a document after re-checking ownership of the
 * stored file, its real size and type, and the subject's PDF limit.
 *
 * @example
 * await createPdfForUser(userId, { subjectId, title, fileName, blobPathname });
 */
export async function createPdfForUser(
  userId: string,
  data: CreatePdfForm,
): Promise<CreatePdfResult> {
  const parsedPath = parseOwnedAttachmentPathname(data.blobPathname);
  if (parsedPath?.context !== "pdfs" || parsedPath.ownerId !== userId) {
    return actionError("pdfs.invalidData");
  }

  const [capacityError, stored] = await Promise.all([
    checkDocumentSubjectCapacity(userId, data.subjectId, pdfCapacityRule),
    readStoredPdf(parsedPath.pathname),
  ]);
  if (capacityError) {
    return capacityError;
  }
  if ("errorCode" in stored) {
    return stored;
  }

  const pdfId = crypto.randomUUID();
  await getDb().insert(pdfDocument).values({
    id: pdfId,
    title: data.title,
    fileName: data.fileName,
    blobPathname: parsedPath.pathname,
    sizeBytes: stored.size,
    subjectId: data.subjectId,
    userId,
  });

  return { success: true, subjectId: data.subjectId, pdfId };
}

async function readStoredPdf(
  pathname: string,
): Promise<StoredBlobHead | ActionErrorResult> {
  const provider = await getMediaStorageProvider();
  if (!provider) {
    return actionError("attachments.notConfigured");
  }

  const stored = await provider.headBlob(pathname);
  if (!stored) {
    return actionError("pdfs.uploadMissing");
  }
  if (stored.contentType !== PDF_MIME_TYPE) {
    return actionError("pdfs.notPdf");
  }

  return stored.size > LIMITS.pdfMaxBytes ? pdfSizeLimitError() : stored;
}
