import "server-only";

import { readByteRangeBounds } from "@/lib/media-storage/byte-range";
import {
  deleteFixtureBlobs,
  type FixtureBlobHead,
  headFixtureBlob,
  listFixtureBlobs,
  streamFixtureBlob,
  writeFixtureBlob,
} from "@/lib/media-storage/fixture-blob-store";
import type {
  MediaStorageProvider,
  ReadBlobInput,
  ReadBlobResult,
} from "@/lib/media-storage/provider";
import { buildMediaStoragePathname } from "@/lib/media-storage/storage-pathname";

// The Vercel Blob SDK reads the store id from a client token's fourth `_`
// segment, so this prefix lets its browser `put` run against a routed fake.
const FIXTURE_CLIENT_TOKEN_PREFIX = "vercel_blob_client_fixture_";

/**
 * Media storage backed by a local folder, for Playwright runs only. Browser
 * uploads still go through the Vercel Blob client, which e2e tests intercept
 * and write into the same folder.
 *
 * @example
 * const provider = createFixtureMediaStorageProvider("test-results/media-storage-fixture");
 */
export function createFixtureMediaStorageProvider(
  rootDir: string,
): MediaStorageProvider {
  return {
    async uploadImage(input) {
      const pathname = buildMediaStoragePathname({
        userId: input.userId,
        context: input.context,
        fileName: input.fileName,
        fallbackFileName: "pasted-image",
      });
      await writeFixtureBlob(rootDir, pathname, input.bytes, input.mimeType);
      return { url: `fixture://${pathname}`, pathname };
    },
    readBlob: (input) => readFixtureBlobRange(rootDir, input),
    headBlob: (pathname) => headFixtureBlob(rootDir, pathname),
    async createClientUploadToken(input) {
      return `${FIXTURE_CLIENT_TOKEN_PREFIX}${Buffer.from(input.pathname).toString("base64url")}`;
    },
    deleteImages: (input) => deleteFixtureBlobs(rootDir, input.pathnames),
    async listImagePathnames(input) {
      const entries = await listFixtureBlobs(rootDir, input.prefix);
      return entries.map((entry) => entry.pathname);
    },
    listImageEntries: (input) => listFixtureBlobs(rootDir, input.prefix),
  };
}

async function readFixtureBlobRange(
  rootDir: string,
  input: ReadBlobInput,
): Promise<ReadBlobResult | null> {
  const head = await headFixtureBlob(rootDir, input.pathname);
  if (!head) {
    return null;
  }

  const span = resolveFixtureSpan(head, input.range);
  return {
    stream:
      head.size === 0
        ? new Blob([]).stream()
        : streamFixtureBlob(rootDir, input.pathname, span.start, span.end),
    contentType: head.contentType,
    contentDisposition: "inline",
    cacheControl: "private, max-age=0",
    etag: `"${head.size}-${head.uploadedAt.getTime()}"`,
    size: span.end - span.start + 1,
    contentRange: input.range
      ? `bytes ${span.start}-${span.end}/${head.size}`
      : null,
  };
}

// Mirrors storage: an unsatisfiable range is an error, not a status.
function resolveFixtureSpan(
  head: FixtureBlobHead,
  range: string | undefined,
): { start: number; end: number } {
  const lastByte = head.size - 1;
  if (!range) {
    return { start: 0, end: lastByte };
  }

  const bounds = readByteRangeBounds(range);
  if (bounds.start > lastByte) {
    throw new Error(
      `fixture blob range must start before byte ${head.size}, got "${range}"`,
    );
  }
  return {
    start: bounds.start,
    end: Math.min(bounds.end ?? lastByte, lastByte),
  };
}
