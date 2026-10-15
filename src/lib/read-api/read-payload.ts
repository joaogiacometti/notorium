// Read routes replaced Server Actions, whose RSC serialization kept `Date`
// values intact. Plain JSON would silently turn every `createdAt`/`dueAt` into
// a string while the TypeScript contracts still promise a `Date`, so dates are
// tagged on the way out and revived on the way in.
const DATE_TAG = "$date";

type TaggedDate = { [DATE_TAG]: string };

/**
 * Serialize a read-route payload to JSON, tagging `Date` values so
 * `decodeReadPayload` can revive them. Invalid dates encode as `null`.
 *
 * @example
 * encodeReadPayload({ at: new Date(0) });
 * // '{"at":{"$date":"1970-01-01T00:00:00.000Z"}}'
 */
export function encodeReadPayload(value: unknown): string {
  return JSON.stringify(value, function tagDates(key, current: unknown) {
    // `Date#toJSON` runs before the replacer, so read the original off the
    // holder object to tell a real Date from an ISO-looking string.
    const original: unknown = this[key];
    if (!(original instanceof Date)) {
      return current;
    }

    return Number.isNaN(original.getTime())
      ? null
      : { [DATE_TAG]: original.toISOString() };
  });
}

/**
 * Parse a read-route JSON body, reviving tagged dates back into `Date`.
 *
 * @example
 * decodeReadPayload('{"at":{"$date":"1970-01-01T00:00:00.000Z"}}');
 * // { at: Date(1970-01-01T00:00:00.000Z) }
 */
export function decodeReadPayload(text: string): unknown {
  return JSON.parse(text, (_key, value: unknown) =>
    isTaggedDate(value) ? new Date(value[DATE_TAG]) : value,
  );
}

function isTaggedDate(value: unknown): value is TaggedDate {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const keys = Object.keys(value);
  return (
    keys.length === 1 &&
    keys[0] === DATE_TAG &&
    typeof (value as Record<string, unknown>)[DATE_TAG] === "string"
  );
}
