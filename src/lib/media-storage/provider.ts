import "server-only";

import { getServerEnv } from "@/env";
import { createVercelBlobMediaStorageProvider } from "@/lib/media-storage/vercel-blob-provider";

export type MediaStorageUploadContext = "notes" | "flashcards";

export interface UploadImageInput {
  userId: string;
  context: MediaStorageUploadContext;
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
}

export interface UploadImageResult {
  url: string;
  pathname: string;
}

export interface ReadImageInput {
  pathname: string;
}

export interface DeleteImagesInput {
  pathnames: string[];
}

export interface ListImagesInput {
  prefix: string;
}

export interface ReadImageResult {
  stream: ReadableStream<Uint8Array>;
  contentType: string;
  contentDisposition: string;
  cacheControl: string;
  etag: string;
  size: number;
}

export interface MediaStorageProvider {
  uploadImage(input: UploadImageInput): Promise<UploadImageResult>;
  readImage(input: ReadImageInput): Promise<ReadImageResult | null>;
  deleteImages(input: DeleteImagesInput): Promise<void>;
  listImagePathnames(input: ListImagesInput): Promise<string[]>;
}

export async function getMediaStorageProvider(): Promise<MediaStorageProvider | null> {
  const env = getServerEnv();

  if (!env.BLOB_READ_WRITE_TOKEN) {
    return null;
  }

  return createVercelBlobMediaStorageProvider();
}
