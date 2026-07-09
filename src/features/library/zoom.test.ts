import { describe, expect, it } from "vitest";
import {
  isValidStoredZoom,
  MAX_ZOOM_SCALE,
  MIN_ZOOM_SCALE,
  parseStoredZoomLevel,
  ZOOM_MODES,
} from "@/features/library/zoom";

describe("isValidStoredZoom", () => {
  it("accepts every known zoom mode", () => {
    for (const mode of ZOOM_MODES) {
      expect(isValidStoredZoom(mode)).toBe(true);
    }
  });

  it("accepts a numeric scale at the range bounds", () => {
    expect(isValidStoredZoom(String(MIN_ZOOM_SCALE))).toBe(true);
    expect(isValidStoredZoom(String(MAX_ZOOM_SCALE))).toBe(true);
    expect(isValidStoredZoom("1.5")).toBe(true);
  });

  it("rejects a numeric scale outside the range", () => {
    expect(isValidStoredZoom(String(MIN_ZOOM_SCALE / 2))).toBe(false);
    expect(isValidStoredZoom(String(MAX_ZOOM_SCALE + 1))).toBe(false);
  });

  it("rejects non-numeric, non-mode strings", () => {
    expect(isValidStoredZoom("")).toBe(false);
    expect(isValidStoredZoom("huge")).toBe(false);
    expect(isValidStoredZoom("fit-everything")).toBe(false);
  });
});

describe("parseStoredZoomLevel", () => {
  it("returns known zoom modes unchanged", () => {
    expect(parseStoredZoomLevel("fit-width")).toBe("fit-width");
  });

  it("returns numeric zooms as numbers", () => {
    expect(parseStoredZoomLevel("1.5")).toBe(1.5);
  });

  it("returns null for invalid zoom values", () => {
    expect(parseStoredZoomLevel("fit-everything")).toBeNull();
  });
});
