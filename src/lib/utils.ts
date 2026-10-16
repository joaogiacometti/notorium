import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { SubjectEntity, SubjectOption } from "@/lib/server/api-contracts";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Deduplicates an array using Set semantics.
 * Note: Uses reference equality for object comparison — suitable for primitives (strings, numbers).
 */
export function uniqueItems<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

export function isSubjectOption(
  subject: SubjectEntity | SubjectOption,
): subject is SubjectOption {
  return "path" in subject && typeof subject.path === "string";
}
