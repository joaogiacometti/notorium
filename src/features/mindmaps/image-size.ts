import {
  MINDMAP_IMAGE_DEFAULT_SIZE,
  MINDMAP_IMAGE_MAX_SIZE,
} from "@/features/mindmaps/constants";

export interface ImageBox {
  width: number;
  height: number;
}

/**
 * Scale a natural image size down to fit within a square `max` box while keeping
 * its aspect ratio. Images already smaller than the box keep their natural size
 * (never upscaled). Non-positive or non-finite inputs fall back to a square box
 * so a fresh paste always gets sensible, finite dimensions.
 *
 * @example
 * scaleImageToBox(1600, 900, 320); // { width: 320, height: 180 }
 */
export function scaleImageToBox(
  naturalWidth: number,
  naturalHeight: number,
  max: number = MINDMAP_IMAGE_MAX_SIZE,
): ImageBox {
  if (
    !Number.isFinite(naturalWidth) ||
    !Number.isFinite(naturalHeight) ||
    naturalWidth <= 0 ||
    naturalHeight <= 0
  ) {
    return {
      width: MINDMAP_IMAGE_DEFAULT_SIZE,
      height: MINDMAP_IMAGE_DEFAULT_SIZE,
    };
  }
  const scale = Math.min(1, max / naturalWidth, max / naturalHeight);
  return {
    width: Math.round(naturalWidth * scale),
    height: Math.round(naturalHeight * scale),
  };
}
