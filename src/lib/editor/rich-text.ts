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
  if (!/<p>[\s\S]*<\/p>/i.test(value)) {
    return value;
  }

  const paragraphPattern = /<p>([\s\S]*?)<\/p>/gi;
  const matches = [...value.matchAll(paragraphPattern)];
  if (matches.length === 0) {
    return value;
  }

  let result = "";
  let lastIndex = 0;
  let changed = false;

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

    result += value.slice(lastIndex, index);
    result += replacement;
    lastIndex = index + paragraphHtml.length;
  }

  result += value.slice(lastIndex);
  return changed ? result : value;
}
