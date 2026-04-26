import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { DeckEntity, DeckOption } from "@/lib/server/api-contracts";

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

/**
 * Reads a File as a base64-encoded string (strips the data URL prefix).
 */
export function readFileAsBase64(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onerror = () => resolve(null);
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        resolve(null);
        return;
      }
      const commaIndex = reader.result.indexOf(",");
      if (commaIndex < 0 || commaIndex + 1 >= reader.result.length) {
        resolve(null);
        return;
      }
      resolve(reader.result.slice(commaIndex + 1));
    };

    reader.readAsDataURL(file);
  });
}

export function isDeckOption(
  deck: DeckEntity | DeckOption,
): deck is DeckOption {
  return "path" in deck && typeof deck.path === "string";
}
