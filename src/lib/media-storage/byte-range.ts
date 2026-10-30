// One bounded or open-ended range (`bytes=0-1023`, `bytes=1024-`). Suffix
// ranges and multi-range lists are rejected: pdf.js never sends them, and a
// rejected header falls back to a full 200 response, which is always valid.
const SINGLE_BYTE_RANGE = /^bytes=(\d{1,15})-(\d{0,15})$/;

/**
 * Returns a normalized `Range` header safe to forward to storage, or null
 * when the request has no usable single byte range.
 *
 * @example
 * parseByteRangeHeader("bytes=0-65535"); // "bytes=0-65535"
 * parseByteRangeHeader("bytes=5-1");     // null
 */
export function parseByteRangeHeader(value: string | null): string | null {
  const match = value?.trim().match(SINGLE_BYTE_RANGE);
  if (!match) {
    return null;
  }

  const start = Number(match[1]);
  if (match[2] === "") {
    return `bytes=${start}-`;
  }

  const end = Number(match[2]);
  return end >= start ? `bytes=${start}-${end}` : null;
}

export interface ByteRangeBounds {
  start: number;
  /** Inclusive last byte, or null for an open-ended range. */
  end: number | null;
}

/**
 * Splits a range from `parseByteRangeHeader` into its byte offsets.
 *
 * @example
 * readByteRangeBounds("bytes=10-"); // { start: 10, end: null }
 */
export function readByteRangeBounds(range: string): ByteRangeBounds {
  const [start, end] = range.slice("bytes=".length).split("-");
  return { start: Number(start), end: end ? Number(end) : null };
}

/**
 * True when a range from `parseByteRangeHeader` starts at or past the end of
 * a blob of `size` bytes, which HTTP answers with 416 (RFC 9110 §14.1.2).
 *
 * @example
 * isByteRangeUnsatisfiable("bytes=1000-", 1000); // true
 */
export function isByteRangeUnsatisfiable(range: string, size: number): boolean {
  return readByteRangeBounds(range).start >= size;
}
