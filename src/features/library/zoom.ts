// Serialization for the reader's persisted zoom level. A ZoomLevel in the
// EmbedPDF zoom plugin is either a mode string ("fit-page" | "fit-width" |
// "automatic") or a numeric scale factor. We store it as text so both shapes
// round-trip through one nullable column. Kept free of the plugin import so it
// stays usable in server validation and mutation code.

// The mode strings mirror the EmbedPDF `ZoomMode` enum values exactly, so a
// stored mode re-applies as the same responsive fit on reopen.
export const ZOOM_MODES = ["automatic", "fit-page", "fit-width"] as const;

export type ZoomModeValue = (typeof ZOOM_MODES)[number];

// Matches the zoom plugin's default min/max scale (0.25x–10x) so a stale or
// hand-crafted value can never persist an out-of-range numeric zoom.
export const MIN_ZOOM_SCALE = 0.25;
export const MAX_ZOOM_SCALE = 10;

export const READER_DEVICES = ["mobile", "desktop"] as const;

export type ReaderDevice = (typeof READER_DEVICES)[number];

function isZoomMode(value: string): value is ZoomModeValue {
  return (ZOOM_MODES as readonly string[]).includes(value);
}

function isInRangeScale(value: number): boolean {
  return (
    Number.isFinite(value) && value >= MIN_ZOOM_SCALE && value <= MAX_ZOOM_SCALE
  );
}

/**
 * Returns true when the string is a storable zoom level: a known mode or a
 * numeric scale within the supported range. Used by the Zod schema so the
 * Server Action rejects anything else before it reaches the database.
 *
 * @example
 * isValidStoredZoom("fit-width"); // true
 * isValidStoredZoom("1.5"); // true
 * isValidStoredZoom("42"); // false (out of range)
 */
export function isValidStoredZoom(value: string): boolean {
  if (isZoomMode(value)) {
    return true;
  }
  return isInRangeScale(Number(value));
}
