import "server-only";

import { collectAllReferencedPathnames } from "@/features/attachments/blob-references";
import {
  getMediaStorageProvider,
  type MediaStorageProvider,
  type StoredBlobEntry,
} from "@/lib/media-storage/provider";
import {
  MEDIA_STORAGE_CONTEXTS,
  MEDIA_STORAGE_NAMESPACE,
} from "@/lib/media-storage/storage-pathname";

const BLOB_ROOT_PREFIX = `${MEDIA_STORAGE_NAMESPACE}/`;

/** Keep the retired mindmaps prefix so account deletion purges older uploads. */
const USER_BLOB_CONTEXTS = [...MEDIA_STORAGE_CONTEXTS, "mindmaps"] as const;

// Blobs younger than this are never collected. An upload that has not yet
// committed its database reference would otherwise look like an orphan; the
// grace period keeps the sweep from deleting freshly uploaded, in-flight blobs.
const DEFAULT_MIN_ORPHAN_AGE_MS = 24 * 60 * 60 * 1000;

// Circuit breaker. A large deletion can indicate a reference-collector
// regression or legitimate bulk content deletion. Above this fraction the sweep
// refuses to delete and reports `aborted` for operator review before files are
// lost. The minimum-scan floor keeps tiny stores — where a couple of orphans trivially
// exceed any fraction — from tripping the brake on normal cleanup.
const DEFAULT_MAX_DELETE_FRACTION = 0.5;
const SAFETY_MIN_SCAN_FOR_FRACTION = 20;

export interface BlobSweepOptions {
  /** When true, report orphans without deleting them. */
  dryRun?: boolean;
  /** Minimum age before a blob is eligible for collection. */
  minAgeMs?: number;
  /**
   * Refuse to delete when orphans exceed this fraction of scanned blobs (the
   * safety circuit breaker). Defaults to {@link DEFAULT_MAX_DELETE_FRACTION}.
   */
  maxDeleteFraction?: number;
}

export interface BlobSweepReport {
  scanned: number;
  referenced: number;
  orphaned: number;
  skippedTooNew: number;
  deleted: number;
  dryRun: boolean;
  /**
   * True when the safety circuit breaker blocked deletion because orphans
   * exceeded {@link BlobSweepOptions.maxDeleteFraction}. Nothing was deleted.
   */
  aborted: boolean;
}

/**
 * Reports whether a sweep would delete an unsafe share of the store, which
 * signals a regression rather than real garbage. Pure so the circuit-breaker
 * threshold can be tested without a provider or database.
 *
 * @example
 * if (exceedsOrphanSafetyLimit(114, 168, 0.5)) abortSweep();
 */
export function exceedsOrphanSafetyLimit(
  orphanCount: number,
  scannedCount: number,
  maxFraction: number,
): boolean {
  if (scannedCount < SAFETY_MIN_SCAN_FOR_FRACTION) {
    return false;
  }

  return orphanCount / scannedCount > maxFraction;
}

/**
 * Partition listed blobs into orphans (unreferenced and older than the grace
 * period) and blobs skipped for being too new. Pure so the orphan-selection
 * logic can be tested without a provider or database.
 *
 * @example
 * const { orphans } = selectOrphanBlobs(entries, referenced, Date.now(), age);
 */
export function selectOrphanBlobs(
  entries: StoredBlobEntry[],
  referenced: ReadonlySet<string>,
  now: number,
  minAgeMs: number,
): { orphans: string[]; skippedTooNew: number } {
  const orphans: string[] = [];
  let skippedTooNew = 0;

  for (const entry of entries) {
    if (referenced.has(entry.pathname)) {
      continue;
    }
    if (now - entry.uploadedAt.getTime() < minAgeMs) {
      skippedTooNew += 1;
      continue;
    }
    orphans.push(entry.pathname);
  }

  return { orphans, skippedTooNew };
}

/**
 * Deletes blobs no live database row references. This is the single cleanup
 * path for edited/deleted records and discarded drafts: individual records
 * cannot safely delete images that other records may still reference.
 * Returns null when no media storage is configured.
 *
 * @example
 * const report = await sweepOrphanBlobs({ dryRun: true });
 */
export async function sweepOrphanBlobs(
  options: BlobSweepOptions = {},
): Promise<BlobSweepReport | null> {
  const provider = await getMediaStorageProvider();

  if (!provider) {
    return null;
  }

  const minAgeMs = options.minAgeMs ?? DEFAULT_MIN_ORPHAN_AGE_MS;
  const dryRun = options.dryRun ?? false;
  const maxDeleteFraction =
    options.maxDeleteFraction ?? DEFAULT_MAX_DELETE_FRACTION;

  const [entries, referenced] = await Promise.all([
    provider.listImageEntries({ prefix: BLOB_ROOT_PREFIX }),
    collectAllReferencedPathnames(),
  ]);

  const { orphans, skippedTooNew } = selectOrphanBlobs(
    entries,
    referenced,
    Date.now(),
    minAgeMs,
  );

  const aborted = exceedsOrphanSafetyLimit(
    orphans.length,
    entries.length,
    maxDeleteFraction,
  );

  if (orphans.length > 0 && !dryRun && !aborted) {
    await provider.deleteImages({ pathnames: orphans });
  }

  return {
    scanned: entries.length,
    referenced: referenced.size,
    orphaned: orphans.length,
    skippedTooNew,
    deleted: dryRun || aborted ? 0 : orphans.length,
    dryRun,
    aborted,
  };
}

async function listUserBlobPathnames(
  provider: MediaStorageProvider,
  userId: string,
): Promise<string[]> {
  const lists = await Promise.all(
    USER_BLOB_CONTEXTS.map((context) =>
      provider.listImagePathnames({
        prefix: `${BLOB_ROOT_PREFIX}${context}/${userId}/`,
      }),
    ),
  );

  return lists.flat();
}

/**
 * Delete every blob owned by a user across all media contexts. Used on account
 * deletion, where the whole account is gone so no reference check is needed;
 * the per-user path prefix already guarantees ownership.
 * Best-effort: storage failures are swallowed so account deletion still
 * succeeds, and the orphan sweep remains the backstop.
 *
 * @example
 * await purgeUserBlobs(userId); // after the auth user record is deleted
 */
export async function purgeUserBlobs(userId: string): Promise<void> {
  const provider = await getMediaStorageProvider();

  if (!provider) {
    return;
  }

  try {
    const pathnames = await listUserBlobPathnames(provider, userId);
    if (pathnames.length === 0) {
      return;
    }
    await provider.deleteImages({ pathnames });
  } catch {}
}
