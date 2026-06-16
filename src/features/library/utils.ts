const BLOB_PATH_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/;

export function sanitizeBookFileName(fileName: string): string {
  const normalized = fileName.trim().replaceAll(/[^a-zA-Z0-9._-]/g, "-");
  if (normalized.length === 0) return "book";
  return normalized.slice(0, 120);
}

export function buildBookBlobPath(userId: string, fileName: string): string {
  const safeName = sanitizeBookFileName(fileName);
  return `notorium/library/${userId}/${crypto.randomUUID()}-${safeName}`;
}

export function validateBookBlobPath(
  userId: string,
  pathname: string,
): boolean {
  const prefix = `notorium/library/${userId}/`;
  if (!pathname.startsWith(prefix)) return false;
  const rest = pathname.slice(prefix.length);
  return rest.length > 0 && BLOB_PATH_UUID_RE.test(rest);
}
