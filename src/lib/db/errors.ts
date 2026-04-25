export function isUniqueViolationError(error: unknown): boolean {
  return (
    hasUniqueViolationCode(error) ||
    (typeof error === "object" &&
      error !== null &&
      "cause" in error &&
      hasUniqueViolationCode((error as { cause?: unknown }).cause))
  );
}

function hasUniqueViolationCode(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  return "code" in error && (error as { code?: string }).code === "23505";
}
