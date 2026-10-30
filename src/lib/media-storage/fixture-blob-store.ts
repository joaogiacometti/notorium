import { createReadStream } from "node:fs";
import {
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

// Disk-backed blob store for Playwright runs (NOTORIUM_MEDIA_STORAGE_FIXTURE_DIR).
// Shared by the app's fixture provider and the e2e upload route, which stands
// in for the browser's direct upload to Vercel Blob. Never used with real data.

const META_SUFFIX = ".meta.json";

export interface FixtureBlobHead {
  size: number;
  contentType: string;
  uploadedAt: Date;
}

export interface FixtureBlobEntry {
  pathname: string;
  uploadedAt: Date;
}

interface FixtureBlobMeta {
  contentType: string;
}

function resolveFixtureBlobPath(rootDir: string, pathname: string): string {
  const root = path.resolve(rootDir);
  const filePath = path.resolve(root, pathname);
  if (!filePath.startsWith(`${root}${path.sep}`)) {
    throw new Error(
      `fixture blob pathname must stay inside the fixture root, got "${pathname}"`,
    );
  }
  return filePath;
}

/**
 * Stores bytes and their content type under `pathname`, replacing any blob there.
 *
 * @example
 * await writeFixtureBlob(dir, "notorium/pdfs/u1/a-book.pdf", bytes, "application/pdf");
 */
export async function writeFixtureBlob(
  rootDir: string,
  pathname: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<void> {
  const filePath = resolveFixtureBlobPath(rootDir, pathname);
  const meta: FixtureBlobMeta = { contentType };
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, bytes);
  await writeFile(`${filePath}${META_SUFFIX}`, JSON.stringify(meta));
}

export async function headFixtureBlob(
  rootDir: string,
  pathname: string,
): Promise<FixtureBlobHead | null> {
  const filePath = resolveFixtureBlobPath(rootDir, pathname);
  try {
    const [stats, metaText] = await Promise.all([
      stat(filePath),
      readFile(`${filePath}${META_SUFFIX}`, "utf8"),
    ]);
    const meta = JSON.parse(metaText) as FixtureBlobMeta;
    return {
      size: stats.size,
      contentType: meta.contentType,
      uploadedAt: stats.mtime,
    };
  } catch {
    return null;
  }
}

/** Streams the inclusive byte span `start..end` of a stored blob. */
export function streamFixtureBlob(
  rootDir: string,
  pathname: string,
  start: number,
  end: number,
): ReadableStream<Uint8Array> {
  const filePath = resolveFixtureBlobPath(rootDir, pathname);
  return Readable.toWeb(
    createReadStream(filePath, { start, end }),
  ) as ReadableStream<Uint8Array>;
}

export async function deleteFixtureBlobs(
  rootDir: string,
  pathnames: string[],
): Promise<void> {
  await Promise.all(
    pathnames.flatMap((pathname) => {
      const filePath = resolveFixtureBlobPath(rootDir, pathname);
      return [
        rm(filePath, { force: true }),
        rm(`${filePath}${META_SUFFIX}`, { force: true }),
      ];
    }),
  );
}

/** Lists stored blobs whose pathname starts with `prefix`. */
export async function listFixtureBlobs(
  rootDir: string,
  prefix: string,
): Promise<FixtureBlobEntry[]> {
  const root = path.resolve(rootDir);
  const files = await readdir(root, { recursive: true }).catch(() => []);
  const pathnames = files
    .map((file) => file.split(path.sep).join("/"))
    .filter((file) => file.startsWith(prefix) && !file.endsWith(META_SUFFIX));
  const heads = await Promise.all(
    pathnames.map((pathname) => headFixtureBlob(root, pathname)),
  );
  return pathnames.flatMap((pathname, index) => {
    const head = heads[index];
    return head ? [{ pathname, uploadedAt: head.uploadedAt }] : [];
  });
}
