import "server-only";

import { getServerEnv } from "@/env";
import type { MediaStorageContext } from "@/lib/media-storage/storage-pathname";
import { createVercelBlobMediaStorageProvider } from "@/lib/media-storage/vercel-blob-provider";

/** Contexts that accept image uploads; PDFs upload straight from the browser. */
export type MediaStorageUploadContext = Exclude<MediaStorageContext, "pdfs">;

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

export interface ReadBlobInput {
  pathname: string;
  /** A validated single `bytes=` range (see `parseByteRangeHeader`). */
  range?: string;
}

export interface DeleteImagesInput {
  pathnames: string[];
}

export interface ListImagesInput {
  prefix: string;
}

export interface StoredBlobEntry {
  pathname: string;
  uploadedAt: Date;
}

export interface ReadBlobResult {
  stream: ReadableStream<Uint8Array>;
  contentType: string;
  contentDisposition: string;
  cacheControl: string;
  etag: string;
  /** Bytes in this response: the requested range when `contentRange` is set. */
  size: number;
  /** Set when storage answered a range request with partial content. */
  contentRange: string | null;
}

export interface StoredBlobHead {
  size: number;
  contentType: string;
}

export interface CreateClientUploadTokenInput {
  pathname: string;
  maximumSizeInBytes: number;
  allowedContentTypes: string[];
}

export interface MediaStorageProvider {
  uploadImage(input: UploadImageInput): Promise<UploadImageResult>;
  readBlob(input: ReadBlobInput): Promise<ReadBlobResult | null>;
  headBlob(pathname: string): Promise<StoredBlobHead | null>;
  /** Issues a short-lived token that lets the browser upload one private blob. */
  createClientUploadToken(input: CreateClientUploadTokenInput): Promise<string>;
  deleteImages(input: DeleteImagesInput): Promise<void>;
  listImagePathnames(input: ListImagesInput): Promise<string[]>;
  listImageEntries(input: ListImagesInput): Promise<StoredBlobEntry[]>;
}

/**
 * Reports whether runtime media storage is configured for upload features.
 *
 * @example
 * const attachmentsEnabled = isMediaStorageConfigured();
 */
export function isMediaStorageConfigured(): boolean {
  return Boolean(getServerEnv().BLOB_READ_WRITE_TOKEN);
}

/**
 * Returns a media storage provider if configured, otherwise null.
 *
 * @example
 * const provider = await getMediaStorageProvider();
 */
export async function getMediaStorageProvider(): Promise<MediaStorageProvider | null> {
  if (!isMediaStorageConfigured()) {
    return null;
  }

  return createVercelBlobMediaStorageProvider();
}
