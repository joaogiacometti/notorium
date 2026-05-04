import { describe, expect, it } from "vitest";
import { DEFAULT_PAGE_SIZE, resolvePageSize } from "@/lib/pagination/page-size";

describe("resolvePageSize", () => {
  it("accepts supported page sizes", () => {
    expect(resolvePageSize("10")).toBe(10);
    expect(resolvePageSize("50")).toBe(50);
    expect(resolvePageSize("100")).toBe(100);
    expect(resolvePageSize("250")).toBe(250);
    expect(resolvePageSize("500")).toBe(500);
  });

  it("falls back for missing, unsupported, or invalid values", () => {
    expect(resolvePageSize(undefined)).toBe(DEFAULT_PAGE_SIZE);
    expect(resolvePageSize("15")).toBe(DEFAULT_PAGE_SIZE);
    expect(resolvePageSize("0")).toBe(DEFAULT_PAGE_SIZE);
    expect(resolvePageSize("many")).toBe(DEFAULT_PAGE_SIZE);
  });
});
