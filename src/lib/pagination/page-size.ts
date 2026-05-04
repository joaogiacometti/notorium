export const DEFAULT_PAGE_SIZE = 25;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 250, 500] as const;

type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];

function isPageSizeOption(value: number): value is PageSizeOption {
  return PAGE_SIZE_OPTIONS.some((option) => option === value);
}

/**
 * Resolves user-provided page size query values to a supported table size.
 *
 * @example
 * resolvePageSize("50")
 */
export function resolvePageSize(value: string | undefined): number {
  const numericValue = Number(value);

  if (!Number.isInteger(numericValue)) {
    return DEFAULT_PAGE_SIZE;
  }

  return isPageSizeOption(numericValue) ? numericValue : DEFAULT_PAGE_SIZE;
}
