const IMAGE_FILE_EXTENSION =
  /\.(?:avif|bmp|gif|ico|jpe?g|png|svg|tiff?|webp)$/i;

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
