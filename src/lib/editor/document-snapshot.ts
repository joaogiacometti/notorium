/** Stable snapshots ignore JSON object key order while preserving node order. */
export function documentSnapshot(value: unknown): string {
  return JSON.stringify(value, (_key, item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return item;
    return Object.fromEntries(
      Object.keys(item)
        .sort()
        .map((key) => [key, item[key]]),
    );
  });
}
