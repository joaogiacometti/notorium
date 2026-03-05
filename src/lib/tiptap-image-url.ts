const IMAGE_FILE_EXTENSION =
  /\.(?:avif|bmp|gif|ico|jpe?g|png|svg|tiff?|webp)$/i;

export function isDirectImageUrl(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }

    return IMAGE_FILE_EXTENSION.test(parsed.pathname);
  } catch {
    return false;
  }
}
