import { describe, expect, it } from "vitest";
import {
  formatReadingProgress,
  isSupportedLibraryBookMime,
} from "@/features/library/constants";

describe("isSupportedLibraryBookMime", () => {
  it("accepts application/pdf regardless of casing or surrounding space", () => {
    expect(isSupportedLibraryBookMime("application/pdf")).toBe(true);
    expect(isSupportedLibraryBookMime("  APPLICATION/PDF ")).toBe(true);
  });

  it("rejects non-pdf mime types", () => {
    expect(isSupportedLibraryBookMime("image/png")).toBe(false);
    expect(isSupportedLibraryBookMime("application/epub+zip")).toBe(false);
  });
});

describe("formatReadingProgress", () => {
  it("includes the total when it is known", () => {
    expect(formatReadingProgress(42, 380)).toBe("Page 42 of 380");
  });

  it("omits the total when it has not been captured yet", () => {
    expect(formatReadingProgress(1, null)).toBe("Page 1");
    expect(formatReadingProgress(3, 0)).toBe("Page 3");
  });
});
