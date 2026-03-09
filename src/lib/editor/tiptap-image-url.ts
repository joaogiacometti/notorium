const IMAGE_FILE_EXTENSION =
  /\.(?:avif|bmp|gif|ico|jpe?g|png|svg|tiff?|webp)$/i;
const IMGUR_SHARED_HOSTS = new Set([
  "imgur.com",
  "www.imgur.com",
  "m.imgur.com",
]);
const IMGUR_BLOCKED_PATH_SEGMENTS = new Set([
  "",
  "a",
  "account",
  "signin",
  "register",
  "settings",
  "user",
  "random",
  "topic",
  "removalrequest",
]);

function parseHttpUrl(value: string): URL | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function hasDirectImagePath(parsed: URL): boolean {
  return IMAGE_FILE_EXTENSION.test(parsed.pathname);
}

export function resolveEmbeddableImageUrl(value: string): string | null {
  const parsed = parseHttpUrl(value);
  if (!parsed || !hasDirectImagePath(parsed)) {
    return null;
  }

  return parsed.toString();
}

export function isSupportedSharedImageUrl(value: string): boolean {
  const parsed = parseHttpUrl(value);
  if (!parsed || resolveEmbeddableImageUrl(parsed.toString())) {
    return false;
  }

  if (!IMGUR_SHARED_HOSTS.has(parsed.hostname.toLowerCase())) {
    return false;
  }

  const segments = parsed.pathname.split("/").filter(Boolean);
  if (segments.length !== 1) {
    return false;
  }

  return !IMGUR_BLOCKED_PATH_SEGMENTS.has(segments[0].toLowerCase());
}

const sharedImageUrlCache = new Map<string, Promise<string | null>>();

export async function resolveSharedEmbeddableImageUrl(
  value: string,
): Promise<string | null> {
  const directImageUrl = resolveEmbeddableImageUrl(value);
  if (directImageUrl) {
    return directImageUrl;
  }

  if (!isSupportedSharedImageUrl(value)) {
    return null;
  }

  const cacheKey = value.trim();
  const cached = sharedImageUrlCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const request = fetch(
    `/api/rich-text/image-url?url=${encodeURIComponent(cacheKey)}`,
  )
    .then(async (response) => {
      if (!response.ok) {
        return null;
      }

      const payload = (await response.json()) as { src?: unknown };
      return typeof payload.src === "string"
        ? resolveEmbeddableImageUrl(payload.src)
        : null;
    })
    .catch(() => null);

  sharedImageUrlCache.set(cacheKey, request);
  return request;
}
