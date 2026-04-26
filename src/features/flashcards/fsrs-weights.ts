import {
  defaultSchedulerParameters,
  fsrsWeightCount,
} from "@/features/flashcards/fsrs-constants";

export function getDefaultFsrsWeights(): number[] {
  return [...defaultSchedulerParameters.w];
}

export function areFsrsWeightsWellFormed(weights: number[]): boolean {
  return (
    weights.length === fsrsWeightCount &&
    weights.every((weight) => Number.isFinite(weight) && weight >= 0)
  );
}

export function isFsrsDesiredRetentionValid(value: number): boolean {
  return Number.isFinite(value) && value > 0 && value < 1;
}

export function normalizeFsrsWeights(
  weights: number[] | null | undefined,
): number[] {
  if (!weights || !areFsrsWeightsWellFormed(weights)) {
    return getDefaultFsrsWeights();
  }

  return [...weights];
}

export function getDefaultFsrsDesiredRetention(): number {
  return defaultSchedulerParameters.request_retention;
}

export function normalizeFsrsDesiredRetention(
  value: string | number | null | undefined,
): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : Number.NaN;

  return Number.isFinite(parsed) && parsed > 0 && parsed < 1
    ? parsed
    : getDefaultFsrsDesiredRetention();
}

export function serializeFsrsWeights(weights: number[]): string {
  return JSON.stringify(weights);
}

export function parseFsrsWeightsWithValidity(value: string): {
  weights: number[];
  isValid: boolean;
} {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value) as unknown;
  } catch {
    return {
      weights: getDefaultFsrsWeights(),
      isValid: false,
    };
  }

  if (!Array.isArray(parsed)) {
    return {
      weights: getDefaultFsrsWeights(),
      isValid: false,
    };
  }

  const normalizedWeights = parsed.map((entry) =>
    typeof entry === "number" ? entry : Number.parseFloat(String(entry)),
  );

  if (!areFsrsWeightsWellFormed(normalizedWeights)) {
    return {
      weights: getDefaultFsrsWeights(),
      isValid: false,
    };
  }

  return {
    weights: normalizedWeights,
    isValid: true,
  };
}

export function parseFsrsWeights(value: string): number[] {
  return parseFsrsWeightsWithValidity(value).weights;
}
