export function isValidDate(value: Date): boolean {
  return Number.isFinite(value.getTime());
}

function isFiniteNumber(value: number): boolean {
  return Number.isFinite(value);
}

export function normalizeDate(
  value: Date | string | null | undefined,
  fallback: Date,
): Date {
  if (!value) {
    return fallback;
  }

  const normalized = value instanceof Date ? new Date(value) : new Date(value);

  return isValidDate(normalized) ? normalized : fallback;
}

export function normalizeOptionalDate(
  value: Date | string | null | undefined,
): Date | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value instanceof Date ? new Date(value) : new Date(value);

  return isValidDate(normalized) ? normalized : undefined;
}

export function formatFsrsNumber(value: number): string {
  return (isFiniteNumber(value) ? value : 0).toFixed(4);
}

export function parseNullableNumeric(
  value: string | number | null | undefined,
): number {
  if (typeof value === "number") {
    return isFiniteNumber(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);

    return isFiniteNumber(parsed) ? parsed : 0;
  }

  return 0;
}

export function normalizeNonNegativeInteger(
  value: number | null | undefined,
  fallback: number = 0,
): number {
  if (typeof value !== "number" || !isFiniteNumber(value)) {
    return fallback;
  }

  return Math.max(0, Math.floor(value));
}

export function normalizeFsrsOutputNumber(
  value: number,
  fallback: number,
): number {
  return isFiniteNumber(value) ? value : fallback;
}
