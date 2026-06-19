import "server-only";

import sharp from "sharp";
import { isSupportedAttachmentImageMimeType } from "@/features/attachments/validation";

// WebP quality and dimension cap applied to every re-encoded upload. 80 is the
// usual sweet spot for visually lossless photos; the cap keeps phone-camera and
// screenshot uploads from storing far more pixels than any view ever renders.
const WEBP_QUALITY = 80;
const MAX_IMAGE_DIMENSION = 2048;
const OPTIMIZED_MIME_TYPE = "image/webp";

export interface ImageOptimizationInput {
  bytes: Uint8Array;
  mimeType: string;
  fileName: string;
}

export interface ImageOptimizationResult {
  bytes: Uint8Array;
  mimeType: string;
  fileName: string;
}

function swapToWebpExtension(fileName: string): string {
  const withoutExtension = fileName.replace(/\.[a-z0-9]+$/i, "");
  const base = withoutExtension.length > 0 ? withoutExtension : fileName;

  return `${base}.webp`;
}

/**
 * Re-encodes a raster image upload to WebP with an EXIF-aware orientation fix and
 * a max-dimension cap before it is stored in blob storage, shrinking note,
 * flashcard, mindmap, and assessment image attachments without a visible quality
 * loss. Non-image uploads (PDFs, docs) pass through untouched, and the original is
 * kept whenever sharp fails to decode the bytes or WebP would not be smaller, so
 * optimization can never enlarge or corrupt an upload.
 *
 * @example
 * const stored = await optimizeImageForStorage({
 *   bytes,
 *   mimeType: "image/png",
 *   fileName: "screenshot.png",
 * });
 * // -> { bytes: <webp>, mimeType: "image/webp", fileName: "screenshot.webp" }
 */
export async function optimizeImageForStorage(
  input: ImageOptimizationInput,
): Promise<ImageOptimizationResult> {
  if (!isSupportedAttachmentImageMimeType(input.mimeType)) {
    return input;
  }

  try {
    const optimized = await sharp(Buffer.from(input.bytes), { animated: true })
      .rotate()
      .resize({
        width: MAX_IMAGE_DIMENSION,
        height: MAX_IMAGE_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();

    if (optimized.byteLength >= input.bytes.byteLength) {
      return input;
    }

    return {
      bytes: optimized,
      mimeType: OPTIMIZED_MIME_TYPE,
      fileName: swapToWebpExtension(input.fileName),
    };
  } catch {
    return input;
  }
}
