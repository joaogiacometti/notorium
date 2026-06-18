import "server-only";

import { del, get, list, put } from "@vercel/blob";
import { getServerEnv } from "@/env";
import type {
  DeleteImagesInput,
  ListImagesInput,
  MediaStorageProvider,
  ReadImageInput,
  ReadImageResult,
  StoredBlobEntry,
  UploadImageInput,
  UploadImageResult,
} from "@/lib/media-storage/provider";

function sanitizeFileName(fileName: string): string {
  const normalized = fileName.trim().replaceAll(/[^a-zA-Z0-9._-]/g, "-");

  if (normalized.length === 0) {
    return "pasted-image";
  }

  return normalized.slice(0, 120);
}

function buildPath(input: UploadImageInput): string {
  const safeName = sanitizeFileName(input.fileName);

  return `notorium/${input.context}/${input.userId}/${crypto.randomUUID()}-${safeName}`;
}

export function createVercelBlobMediaStorageProvider(): MediaStorageProvider {
  const env = getServerEnv();

  function getBlobToken(): string {
    if (!env.BLOB_READ_WRITE_TOKEN) {
      throw new Error("blob token is not configured");
    }

    return env.BLOB_READ_WRITE_TOKEN;
  }

  async function uploadFile(
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

  async function readFile(
    input: ReadImageInput,
  ): Promise<ReadImageResult | null> {
    const result = await get(input.pathname, {
      access: "private",
      token: getBlobToken(),
    });

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
    };
  }

  async function deleteFiles(input: DeleteImagesInput): Promise<void> {
    if (input.pathnames.length === 0) {
      return;
    }

    await del(input.pathnames, {
      token: getBlobToken(),
    });
  }

  async function listFilePathnames(input: ListImagesInput): Promise<string[]> {
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

  async function listFileEntries(
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
    uploadFile,
    readFile,
    deleteFiles,
    listFilePathnames,
    listFileEntries,
    async uploadImage(input: UploadImageInput): Promise<UploadImageResult> {
      return uploadFile(input);
    },
    async readImage(input: ReadImageInput): Promise<ReadImageResult | null> {
      return readFile(input);
    },
    async deleteImages(input: DeleteImagesInput): Promise<void> {
      return deleteFiles(input);
    },
    async listImagePathnames(input: ListImagesInput): Promise<string[]> {
      return listFilePathnames(input);
    },
  };
}
