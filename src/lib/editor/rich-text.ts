import { resolveEmbeddableImageUrl } from "@/lib/editor/tiptap-image-url";

// Math nodes serialize as empty <span>/<div> with the LaTeX held in a
// data-latex attribute (see tiptap-math-extensions.ts). A plain tag strip would
// drop that attribute, so equations must be surfaced as their LaTeX text to stay
// searchable and to keep flashcard length validation accurate.
const MATH_NODE_PATTERN =
  /<(span|div)\b[^>]*\bdata-type="(?:inline|block)-math"[^>]*>[\s\S]*?<\/\1>/gi;

// Private-use sentinel marking where extracted LaTeX is reinserted. It carries
// no angle brackets or HTML entities and is not whitespace, so it survives the
// tag-stripping and whitespace-collapsing passes below intact.
const MATH_TOKEN_SENTINEL = "\uE000";

/**
 * Runs `transform` (tag stripping, whitespace collapse, casing) on the input
 * with each math node swapped for an inert token, then restores every equation's
 * decoded LaTeX. Decoding the LaTeX inline before `transform` would let its
 * `<`/`>` characters be eaten by the `/<[^>]*>/g` tag strip — e.g. the equation
 * `f(x) < g(x) > 0` would collapse to `f(x)  0`. Tokenizing keeps the LaTeX out
 * of the strip's reach. See rich-text.test.ts for the regression.
 */
function transformAroundMath(
  value: string,
  transform: (mathFreeHtml: string) => string,
): string {
  const equations: string[] = [];
  const tokenized = value.replaceAll(MATH_NODE_PATTERN, (match) => {
    const latexMatch = /\bdata-latex="([^"]*)"/i.exec(match);
    if (!latexMatch) {
      return " ";
    }

    const index = equations.length;
    equations.push(decodeHtmlEntities(latexMatch[1]));
    return ` ${MATH_TOKEN_SENTINEL}${index}${MATH_TOKEN_SENTINEL} `;
  });

  let result = transform(tokenized);
  equations.forEach((latex, index) => {
    result = result.replaceAll(
      `${MATH_TOKEN_SENTINEL}${index}${MATH_TOKEN_SENTINEL}`,
      latex,
    );
  });

  return result;
}

export function richTextToPlainText(value: string): string {
  return transformAroundMath(value, (html) =>
    html
      .replaceAll(/<[^>]*>/g, " ")
      .replaceAll("&nbsp;", " ")
      .replaceAll(/\s+/g, " ")
      .trim(),
  );
}

export function richTextToPlainTextWithImagePlaceholders(
  value: string,
): string {
  return transformAroundMath(value, (html) =>
    html
      .replaceAll(/<img\b[^>]*>/gi, " [Image] ")
      .replaceAll(/<[^>]*>/g, " ")
      .replaceAll("&nbsp;", " ")
      .replaceAll(/\s+/g, " ")
      .trim(),
  );
}

function normalizeImageSourceForUniqueness(value: string): string {
  try {
    return new URL(value).toString();
  } catch {
    return value;
  }
}

export function normalizeRichTextForUniqueness(value: string): string {
  return transformAroundMath(value, (html) => {
    const withImageTokens = html.replaceAll(
      /<img\b([^>]*)>/gi,
      (_match, attributes: string) => {
        const srcMatch = /\bsrc\s*=\s*["']([^"']*)["']/i.exec(attributes);

        if (!srcMatch) {
          return " ";
        }

        const src = decodeHtmlEntities(srcMatch[1]).trim();

        if (src.length === 0) {
          return " ";
        }

        return ` image:${normalizeImageSourceForUniqueness(src)} `;
      },
    );

    return decodeHtmlEntities(withImageTokens)
      .replaceAll(/<[^>]*>/g, " ")
      .replaceAll("&nbsp;", " ")
      .replaceAll(/\s+/g, " ")
      .trim()
      .toLowerCase();
  });
}

export function replaceImagesWithPlaceholders(value: string): {
  text: string;
  images: string[];
} {
  const images: string[] = [];
  let index = 0;
  const text = value.replaceAll(/<img\b[^>]*>/gi, (match) => {
    images.push(match);
    const placeholder = `{{IMAGE_${index}}}`;
    index++;
    return placeholder;
  });
  return { text, images };
}

export function restoreImagePlaceholders(
  value: string,
  images: string[],
): string {
  let result = value;
  const unrestored: string[] = [];

  images.forEach((img, index) => {
    const placeholder = `{{IMAGE_${index}}}`;
    if (result.includes(placeholder)) {
      result = result.replaceAll(placeholder, img);
    } else {
      unrestored.push(img);
    }
  });

  if (unrestored.length > 0) {
    result += unrestored.join("");
  }

  return result;
}

export function hasRichTextContent(value: string): boolean {
  return /<img\b/i.test(value) || richTextToPlainText(value).length > 0;
}

function normalizeInternalAttachmentSource(value: string): string | null {
  const trimmed = value.trim();
  if (!isInternalAttachmentImageSource(trimmed)) {
    return null;
  }

  try {
    const parsed = new URL(trimmed, "http://localhost");
    return `${parsed.pathname}?${parsed.searchParams.toString()}`;
  } catch {
    return null;
  }
}

function getRenderedInternalAttachmentImageSources(value: string): string[] {
  const sources: string[] = [];

  value.replaceAll(/<img\b([^>]*)>/gi, (_imageHtml, attributes: string) => {
    const srcMatch = /\bsrc\s*=\s*["']([^"']*)["']/i.exec(attributes);
    const normalized = srcMatch
      ? normalizeInternalAttachmentSource(decodeHtmlEntities(srcMatch[1]))
      : null;

    if (normalized) {
      sources.push(normalized);
    }

    return "";
  });

  const paragraphPattern = /<p>([\s\S]*?)<\/p>/gi;
  for (const match of value.matchAll(paragraphPattern)) {
    const [, innerHtml] = match;
    const candidate = extractImageUrlCandidate(innerHtml);
    const normalized = candidate
      ? normalizeInternalAttachmentSource(candidate)
      : null;

    if (normalized) {
      sources.push(normalized);
    }
  }

  return sources;
}

export function countInternalAttachmentImages(value: string): number {
  return getRenderedInternalAttachmentImageSources(value).length;
}

function getInternalAttachmentPathnameFromSource(value: string): string | null {
  const trimmed = value.trim();
  if (!isInternalAttachmentImageSource(trimmed)) {
    return null;
  }

  try {
    const parsed = new URL(trimmed, "http://localhost");
    const pathname = parsed.searchParams.get("pathname")?.trim() ?? "";
    return pathname.length > 0 ? pathname : null;
  } catch {
    return null;
  }
}

export function getInternalAttachmentPathnames(value: string): string[] {
  const pathnames = new Set<string>();

  for (const source of getRenderedInternalAttachmentImageSources(value)) {
    const pathname = getInternalAttachmentPathnameFromSource(source);

    if (pathname) {
      pathnames.add(pathname);
    }
  }

  return [...pathnames];
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
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
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
  const altMatch = /\balt\s*=\s*["']([^"']*)["']/i.exec(attributes);
  const srcMatch = /\bsrc\s*=\s*["']([^"']*)["']/i.exec(attributes);
  const alt = altMatch ? decodeHtmlEntities(altMatch[1]).trim() : "";
  const src = srcMatch ? decodeHtmlEntities(srcMatch[1]).trim() : "";

  if (alt.length > 0) {
    return alt;
  }

  return src.length > 0 ? src : null;
}

const INTERNAL_ATTACHMENT_IMAGE_PATH = "/api/attachments/blob";

function isInternalAttachmentImageSource(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) {
    return false;
  }

  try {
    const parsed = new URL(trimmed, "http://localhost");
    if (parsed.pathname !== INTERNAL_ATTACHMENT_IMAGE_PATH) {
      return false;
    }

    const pathname = parsed.searchParams.get("pathname")?.trim() ?? "";
    return pathname.length > 0;
  } catch {
    return false;
  }
}

function isAllowedRenderedImageSource(value: string): boolean {
  return (
    isInternalAttachmentImageSource(value) ||
    resolveEmbeddableImageUrl(value) !== null
  );
}

function normalizeUnsupportedImageMarkup(value: string): string {
  return value.replaceAll(/<img\b([^>]*)>/gi, (imageHtml, attributes) => {
    const srcMatch = /\bsrc\s*=\s*["']([^"']*)["']/i.exec(attributes);
    if (!srcMatch) {
      return imageHtml;
    }

    const src = decodeHtmlEntities(srcMatch[1]).trim();
    if (isAllowedRenderedImageSource(src)) {
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

    if (isInternalAttachmentImageSource(decoded)) {
      return decoded;
    }

    return resolveEmbeddableImageUrl(decoded);
  }

  const anchorMatch =
    /^<a\s+[^>]*href=["']([^"']+)["'][^>]*>[\s\S]*<\/a>$/i.exec(trimmed);
  if (!anchorMatch) {
    return null;
  }

  const href = decodeHtmlEntities(anchorMatch[1]).trim();
  const anchorText = richTextToPlainText(trimmed);

  if (isInternalAttachmentImageSource(href) && anchorText === href) {
    return href;
  }

  return resolveEmbeddableImageUrl(href);
}

export function removeInternalAttachmentImagesForTransfer(
  value: string,
): string {
  const withoutAttachmentImages = value.replaceAll(
    /<img\b([^>]*)>/gi,
    (imageHtml, attributes: string) => {
      const srcMatch = /\bsrc\s*=\s*["']([^"']*)["']/i.exec(attributes);
      const normalized = srcMatch
        ? normalizeInternalAttachmentSource(decodeHtmlEntities(srcMatch[1]))
        : null;

      return normalized ? "" : imageHtml;
    },
  );

  const withoutAttachmentParagraphs = withoutAttachmentImages.replaceAll(
    /<p>([\s\S]*?)<\/p>/gi,
    (paragraphHtml, innerHtml: string) => {
      const candidate = extractImageUrlCandidate(innerHtml);
      const normalized = candidate
        ? normalizeInternalAttachmentSource(candidate)
        : null;

      return normalized ? "" : paragraphHtml;
    },
  );

  return withoutAttachmentParagraphs.replaceAll(
    /<p>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>/gi,
    "",
  );
}

function normalizeRichTextForRenderingWithResolvedImageUrls(
  value: string,
  resolveImageUrl: (value: string) => string | null,
): string {
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
      if (isInternalAttachmentImageSource(candidate)) {
        replacement = `<img src="${escapeHtmlAttribute(candidate)}" alt="">`;
        changed = true;
      } else {
        const directImageUrl = resolveImageUrl(candidate);

        if (directImageUrl) {
          replacement = `<img src="${escapeHtmlAttribute(directImageUrl)}" alt="">`;
          changed = true;
        }
      }
    }

    result += normalizedImages.slice(lastIndex, index);
    result += replacement;
    lastIndex = index + paragraphHtml.length;
  }

  result += normalizedImages.slice(lastIndex);
  return changed ? result : normalizedImages;
}

export function normalizeRichTextForStaticRendering(value: string): string {
  return normalizeRichTextForRenderingWithResolvedImageUrls(
    value,
    resolveEmbeddableImageUrl,
  );
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
      if (isInternalAttachmentImageSource(candidate)) {
        replacement = `<img src="${escapeHtmlAttribute(candidate)}" alt="">`;
        changed = true;
      } else {
        const resolvedImageUrl = await resolveImageUrl(candidate);
        const directImageUrl =
          resolvedImageUrl && resolveEmbeddableImageUrl(resolvedImageUrl);

        if (directImageUrl) {
          replacement = `<img src="${escapeHtmlAttribute(directImageUrl)}" alt="">`;
          changed = true;
        }
      }
    }

    result += normalizedImages.slice(lastIndex, index);
    result += replacement;
    lastIndex = index + paragraphHtml.length;
  }

  result += normalizedImages.slice(lastIndex);
  return changed ? result : normalizedImages;
}
