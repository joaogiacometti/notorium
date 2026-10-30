import "server-only";

import { BlobNotFoundError, del, get, head, list, put } from "@vercel/blob";
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import { getServerEnv } from "@/env";
import type {
  CreateClientUploadTokenInput,
  DeleteImagesInput,
  ListImagesInput,
  MediaStorageProvider,
  ReadBlobInput,
  ReadBlobResult,
  StoredBlobEntry,
  StoredBlobHead,
  UploadImageInput,
  UploadImageResult,
} from "@/lib/media-storage/provider";
import { buildMediaStoragePathname } from "@/lib/media-storage/storage-pathname";

function buildPath(input: UploadImageInput): string {
  return buildMediaStoragePathname({
    userId: input.userId,
    context: input.context,
    fileName: input.fileName,
    fallbackFileName: "pasted-image",
  });
}

export function createVercelBlobMediaStorageProvider(): MediaStorageProvider {
  const env = getServerEnv();

  function getBlobToken(): string {
    if (!env.BLOB_READ_WRITE_TOKEN) {
      throw new Error("blob token is not configured");
    }

    return env.BLOB_READ_WRITE_TOKEN;
  }

  async function uploadImage(
    input: UploadImageInput,
  ): Promise<UploadImageResult> {
    const result = await put(buildPath(input), Buffer.from(input.bytes), {
      access: "private",
      addRandomSuffix: false,
      contentType: input.mimeType,
      token: getBlobToken(),
    });

    return {
      url: result.url,
      pathname: result.pathname,
    };
  }

  async function readBlob(
    input: ReadBlobInput,
  ): Promise<ReadBlobResult | null> {
    const result = await get(input.pathname, {
      access: "private",
      token: getBlobToken(),
      headers: input.range ? { range: input.range } : undefined,
    });

    // The SDK reports a 206 partial response as statusCode 200; the raw
    // `content-range` header is what distinguishes it.
    if (result?.statusCode !== 200 || !result.blob.contentType) {
      return null;
    }

    return {
      stream: result.stream,
      contentType: result.blob.contentType,
      contentDisposition: result.blob.contentDisposition,
      cacheControl: result.blob.cacheControl,
      etag: result.blob.etag,
      size: result.blob.size,
      contentRange: result.headers.get("content-range"),
    };
  }

  async function headBlob(pathname: string): Promise<StoredBlobHead | null> {
    try {
      const result = await head(pathname, { token: getBlobToken() });
      return { size: result.size, contentType: result.contentType };
    } catch (error) {
      if (error instanceof BlobNotFoundError) {
        return null;
      }
      throw error;
    }
  }

  async function createClientUploadToken(
    input: CreateClientUploadTokenInput,
  ): Promise<string> {
    return generateClientTokenFromReadWriteToken({
      token: getBlobToken(),
      pathname: input.pathname,
      maximumSizeInBytes: input.maximumSizeInBytes,
      allowedContentTypes: input.allowedContentTypes,
      addRandomSuffix: false,
      allowOverwrite: false,
    });
  }

  async function deleteImages(input: DeleteImagesInput): Promise<void> {
    if (input.pathnames.length === 0) {
      return;
    }

    await del(input.pathnames, {
      token: getBlobToken(),
    });
  }

  async function listImagePathnames(input: ListImagesInput): Promise<string[]> {
    const pathnames: string[] = [];
    let cursor: string | undefined;

    do {
      const result = await list({
        token: getBlobToken(),
        prefix: input.prefix,
        cursor,
      });

      pathnames.push(...result.blobs.map((blob) => blob.pathname));
      cursor = result.hasMore ? result.cursor : undefined;
    } while (cursor);

    return pathnames;
  }

  async function listImageEntries(
    input: ListImagesInput,
  ): Promise<StoredBlobEntry[]> {
    const entries: StoredBlobEntry[] = [];
    let cursor: string | undefined;

    do {
      const result = await list({
        token: getBlobToken(),
        prefix: input.prefix,
        cursor,
      });

      for (const blob of result.blobs) {
        entries.push({ pathname: blob.pathname, uploadedAt: blob.uploadedAt });
      }
      cursor = result.hasMore ? result.cursor : undefined;
    } while (cursor);

    return entries;
  }

  return {
    uploadImage,
    readBlob,
    headBlob,
    createClientUploadToken,
    deleteImages,
    listImagePathnames,
    listImageEntries,
  };
}
