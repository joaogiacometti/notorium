export function richTextToPlainText(value: string): string {
  return value
    .replaceAll(/<[^>]*>/g, " ")
    .replaceAll("&nbsp;", " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

export function hasRichTextContent(value: string): boolean {
  return /<img\b/i.test(value) || richTextToPlainText(value).length > 0;
}

export function getRichTextExcerpt(value: string, maxLength: number): string {
  const plainText = richTextToPlainText(value);
  if (plainText.length <= maxLength) {
    return plainText;
  }

  return `${plainText.slice(0, maxLength).trimEnd()}...`;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function extractImageFallbackText(attributes: string): string | null {
  const altMatch = attributes.match(/\balt\s*=\s*["']([^"']*)["']/i);
  const srcMatch = attributes.match(/\bsrc\s*=\s*["']([^"']*)["']/i);
  const alt = altMatch ? decodeHtmlEntities(altMatch[1]).trim() : "";
  const src = srcMatch ? decodeHtmlEntities(srcMatch[1]).trim() : "";

  if (alt.length > 0) {
    return alt;
  }

  return src.length > 0 ? src : null;
}

function isRelativeImageSource(value: string): boolean {
  if (value.trim().length === 0) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol !== "http:" && parsed.protocol !== "https:";
  } catch {
    return true;
  }
}

function normalizeUnsupportedImageMarkup(value: string): string {
  return value.replaceAll(/<img\b([^>]*)>/gi, (imageHtml, attributes) => {
    const srcMatch = attributes.match(/\bsrc\s*=\s*["']([^"']*)["']/i);
    if (!srcMatch) {
      return imageHtml;
    }

    const src = decodeHtmlEntities(srcMatch[1]).trim();
    if (!isRelativeImageSource(src)) {
      return imageHtml;
    }

    const fallbackText = extractImageFallbackText(attributes);
    return fallbackText ? escapeHtmlAttribute(fallbackText) : "";
  });
}

function extractImageUrlCandidate(innerHtml: string): string | null {
  const trimmed = innerHtml.trim();
  if (trimmed.length === 0) {
    return null;
  }

  if (!/<[^>]+>/.test(trimmed)) {
    const decoded = decodeHtmlEntities(trimmed).trim();

    try {
      return new URL(decoded).toString();
    } catch {
      return null;
    }
  }

  const anchorMatch = trimmed.match(
    /^<a\s+[^>]*href=["']([^"']+)["'][^>]*>[\s\S]*<\/a>$/i,
  );

  return anchorMatch ? decodeHtmlEntities(anchorMatch[1]).trim() : null;
}

export async function normalizeRichTextForRendering(
  value: string,
  resolveImageUrl: (value: string) => Promise<string | null>,
): Promise<string> {
  const normalizedImages = normalizeUnsupportedImageMarkup(value);

  if (!/<p>[\s\S]*<\/p>/i.test(normalizedImages)) {
    return normalizedImages;
  }

  const paragraphPattern = /<p>([\s\S]*?)<\/p>/gi;
  const matches = [...normalizedImages.matchAll(paragraphPattern)];
  if (matches.length === 0) {
    return normalizedImages;
  }

  let result = "";
  let lastIndex = 0;
  let changed = normalizedImages !== value;

  for (const match of matches) {
    const [paragraphHtml, innerHtml] = match;
    const index = match.index ?? 0;
    const candidate = extractImageUrlCandidate(innerHtml);
    let replacement = paragraphHtml;

    if (candidate) {
      const resolvedImageUrl = await resolveImageUrl(candidate);
      if (resolvedImageUrl) {
        replacement = `<img src="${escapeHtmlAttribute(resolvedImageUrl)}" alt="">`;
        changed = true;
      }
    }

    result += normalizedImages.slice(lastIndex, index);
    result += replacement;
    lastIndex = index + paragraphHtml.length;
  }

  result += normalizedImages.slice(lastIndex);
  return changed ? result : normalizedImages;
}
