/**
 * Image occlusion regions and derived-content helpers.
 *
 * An image occlusion "note" is a single source image plus one or more
 * rectangular mask regions. Each region becomes its own independently scheduled
 * sibling card that hides that region — while every other region also stays
 * hidden ("hide all, guess one") — and asks the learner to recall what is
 * underneath.
 *
 * Region coordinates are normalized to the 0..1 range relative to the image so
 * masks stay aligned at any display size in the editor or during review. This
 * module is intentionally pure (no DB or I/O) so it can be imported by the
 * Drizzle schema for column typing and shared with client components.
 */

import { LIMITS } from "@/lib/config/limits";

export interface OcclusionRegion {
  /** Stable id used to match siblings to their tested mask across edits. */
  id: string;
  /** Left edge, normalized 0..1 relative to image width. */
  x: number;
  /** Top edge, normalized 0..1 relative to image height. */
  y: number;
  /** Width, normalized 0..1 relative to image width. */
  width: number;
  /** Height, normalized 0..1 relative to image height. */
  height: number;
  /** Optional author label shown in the manage table and as recall context. */
  label?: string;
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

/**
 * Clamps a region into the 0..1 image box, keeping width/height within bounds.
 *
 * @example
 * normalizeOcclusionRegion({ id: "a", x: -0.1, y: 0.2, width: 2, height: 0.3 });
 * // { id: "a", x: 0, y: 0.2, width: 1, height: 0.3 }
 */
export function normalizeOcclusionRegion(
  region: OcclusionRegion,
): OcclusionRegion {
  const x = clamp01(region.x);
  const y = clamp01(region.y);
  const width = clamp01(region.width);
  const height = clamp01(region.height);
  const normalized: OcclusionRegion = {
    id: region.id,
    x,
    y,
    width: Math.min(width, 1 - x),
    height: Math.min(height, 1 - y),
  };
  const label = region.label?.trim();
  if (label) {
    normalized.label = label.slice(0, LIMITS.occlusionLabelMax);
  }
  return normalized;
}

/**
 * Returns true when a region has a stable id and positive area within bounds.
 *
 * @example
 * isValidOcclusionRegion({ id: "a", x: 0, y: 0, width: 0.5, height: 0.5 }); // true
 */
export function isValidOcclusionRegion(region: OcclusionRegion): boolean {
  return (
    region.id.length > 0 &&
    region.width > 0 &&
    region.height > 0 &&
    region.x >= 0 &&
    region.y >= 0 &&
    region.x + region.width <= 1 + 1e-6 &&
    region.y + region.height <= 1 + 1e-6
  );
}

function regionLabel(region: OcclusionRegion, index: number): string {
  const label = region.label?.trim();
  return label && label.length > 0 ? label : `Region ${index + 1}`;
}

/**
 * Plain-text front stored for the manage table and search. The visual prompt is
 * the masked image; this is only the textual representation of the card.
 *
 * @example
 * deriveOcclusionFront({ id: "a", x: 0, y: 0, width: 1, height: 1 }, 0);
 * // "Image occlusion · Region 1"
 */
export function deriveOcclusionFront(
  region: OcclusionRegion,
  index: number,
): string {
  return `Image occlusion · ${regionLabel(region, index)}`;
}

/**
 * Plain-text back stored alongside the card: the label of the revealed region.
 *
 * @example
 * deriveOcclusionBack({ id: "a", x: 0, y: 0, width: 1, height: 1, label: "Aorta" }, 0);
 * // "Aorta"
 */
export function deriveOcclusionBack(
  region: OcclusionRegion,
  index: number,
): string {
  return regionLabel(region, index);
}

/**
 * Synthetic, per-user-unique key for the `frontNormalized` column. Occlusion
 * cards have no authored front text, so the note id plus mask id guarantee
 * uniqueness without colliding with text cards.
 *
 * @example
 * occlusionFrontNormalized("note-1", "mask-2"); // "occlusion:note-1:mask-2"
 */
export function occlusionFrontNormalized(
  noteId: string,
  maskId: string,
): string {
  return `occlusion:${noteId}:${maskId}`;
}

/**
 * Finds the tested region within a note's regions by mask id.
 *
 * @example
 * findOcclusionRegion(regions, "mask-2");
 */
export function findOcclusionRegion(
  regions: OcclusionRegion[],
  maskId: string,
): OcclusionRegion | null {
  return regions.find((region) => region.id === maskId) ?? null;
}

export interface PixelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Projects a normalized region into pixel coordinates for a rendered image of
 * the given size. Inverse of {@link toNormalizedRect}.
 *
 * @example
 * regionToPixelRect({ id: "a", x: 0.5, y: 0, width: 0.5, height: 1 }, 200, 100);
 * // { x: 100, y: 0, width: 100, height: 100 }
 */
export function regionToPixelRect(
  region: OcclusionRegion,
  width: number,
  height: number,
): PixelRect {
  return {
    x: region.x * width,
    y: region.y * height,
    width: region.width * width,
    height: region.height * height,
  };
}

/**
 * Projects a pixel rect back into normalized 0..1 coordinates for an image of
 * the given size. Guards against a zero-size container.
 *
 * @example
 * pixelRectToNormalized({ x: 100, y: 0, width: 100, height: 100 }, 200, 100);
 * // { x: 0.5, y: 0, width: 0.5, height: 1 }
 */
export function pixelRectToNormalized(
  rect: PixelRect,
  width: number,
  height: number,
): Omit<OcclusionRegion, "id" | "label"> {
  const safeWidth = width > 0 ? width : 1;
  const safeHeight = height > 0 ? height : 1;
  return {
    x: clamp01(rect.x / safeWidth),
    y: clamp01(rect.y / safeHeight),
    width: clamp01(rect.width / safeWidth),
    height: clamp01(rect.height / safeHeight),
  };
}
