import { describe, expect, it } from "vitest";
import {
  deriveOcclusionBack,
  deriveOcclusionFront,
  findOcclusionRegion,
  isValidOcclusionRegion,
  normalizeOcclusionRegion,
  type OcclusionRegion,
  occlusionFrontNormalized,
  pixelRectToNormalized,
  regionToPixelRect,
} from "@/features/flashcards/occlusion";

function region(overrides: Partial<OcclusionRegion> = {}): OcclusionRegion {
  return {
    id: "mask-1",
    x: 0.1,
    y: 0.2,
    width: 0.3,
    height: 0.4,
    ...overrides,
  };
}

describe("normalizeOcclusionRegion", () => {
  it("clamps coordinates and dimensions into the 0..1 image box", () => {
    const result = normalizeOcclusionRegion(
      region({ x: -0.5, y: 0.6, width: 2, height: 0.9 }),
    );
    expect(result).toEqual({
      id: "mask-1",
      x: 0,
      y: 0.6,
      width: 1,
      height: 0.4,
    });
  });

  it("trims and length-caps the label, dropping empty labels", () => {
    expect(normalizeOcclusionRegion(region({ label: "  Aorta  " })).label).toBe(
      "Aorta",
    );
    expect(
      normalizeOcclusionRegion(region({ label: "   " })).label,
    ).toBeUndefined();
  });

  it("coerces NaN coordinates to zero", () => {
    const result = normalizeOcclusionRegion(region({ x: Number.NaN }));
    expect(result.x).toBe(0);
  });
});

describe("isValidOcclusionRegion", () => {
  it("accepts a positive-area region within bounds", () => {
    expect(isValidOcclusionRegion(region())).toBe(true);
  });

  it("rejects zero-area, out-of-bounds, or id-less regions", () => {
    expect(isValidOcclusionRegion(region({ width: 0 }))).toBe(false);
    expect(isValidOcclusionRegion(region({ x: 0.9, width: 0.5 }))).toBe(false);
    expect(isValidOcclusionRegion(region({ id: "" }))).toBe(false);
  });
});

describe("derived content", () => {
  it("uses the label when present, otherwise a region ordinal", () => {
    expect(deriveOcclusionFront(region({ label: "Aorta" }), 0)).toBe(
      "Image occlusion · Aorta",
    );
    expect(deriveOcclusionFront(region(), 2)).toBe(
      "Image occlusion · Region 3",
    );
    expect(deriveOcclusionBack(region({ label: "Aorta" }), 0)).toBe("Aorta");
    expect(deriveOcclusionBack(region(), 1)).toBe("Region 2");
  });
});

describe("occlusionFrontNormalized", () => {
  it("builds a stable synthetic key from note and mask ids", () => {
    expect(occlusionFrontNormalized("note-1", "mask-2")).toBe(
      "occlusion:note-1:mask-2",
    );
  });
});

describe("findOcclusionRegion", () => {
  it("returns the region matching the mask id or null", () => {
    const regions = [region({ id: "a" }), region({ id: "b" })];
    expect(findOcclusionRegion(regions, "b")?.id).toBe("b");
    expect(findOcclusionRegion(regions, "missing")).toBeNull();
  });
});

describe("pixel/normalized projection", () => {
  it("round-trips a region through pixel space", () => {
    const source = region({ x: 0.5, y: 0, width: 0.5, height: 1 });
    const rect = regionToPixelRect(source, 200, 100);
    expect(rect).toEqual({ x: 100, y: 0, width: 100, height: 100 });
    expect(pixelRectToNormalized(rect, 200, 100)).toEqual({
      x: 0.5,
      y: 0,
      width: 0.5,
      height: 1,
    });
  });

  it("guards against a zero-size container", () => {
    expect(
      pixelRectToNormalized({ x: 10, y: 10, width: 10, height: 10 }, 0, 0),
    ).toEqual({ x: 1, y: 1, width: 1, height: 1 });
  });
});
