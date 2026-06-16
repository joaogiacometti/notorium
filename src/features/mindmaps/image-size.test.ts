import { describe, expect, it } from "vitest";
import {
  MINDMAP_IMAGE_DEFAULT_SIZE,
  MINDMAP_IMAGE_MAX_SIZE,
} from "@/features/mindmaps/constants";
import { scaleImageToBox } from "@/features/mindmaps/image-size";

describe("scaleImageToBox", () => {
  it("scales a wide image down to the box width, preserving aspect ratio", () => {
    expect(scaleImageToBox(1600, 900, 320)).toEqual({
      width: 320,
      height: 180,
    });
  });

  it("scales a tall image down to the box height, preserving aspect ratio", () => {
    expect(scaleImageToBox(900, 1600, 320)).toEqual({
      width: 180,
      height: 320,
    });
  });

  it("never upscales an image already smaller than the box", () => {
    expect(scaleImageToBox(120, 80, 320)).toEqual({ width: 120, height: 80 });
  });

  it("defaults to the max box for the largest dimension", () => {
    const box = scaleImageToBox(2000, 2000);
    expect(box).toEqual({
      width: MINDMAP_IMAGE_MAX_SIZE,
      height: MINDMAP_IMAGE_MAX_SIZE,
    });
  });

  it("falls back to a square default for non-positive dimensions", () => {
    expect(scaleImageToBox(0, 0)).toEqual({
      width: MINDMAP_IMAGE_DEFAULT_SIZE,
      height: MINDMAP_IMAGE_DEFAULT_SIZE,
    });
  });

  it("falls back to a square default for non-finite dimensions", () => {
    expect(scaleImageToBox(Number.NaN, 100)).toEqual({
      width: MINDMAP_IMAGE_DEFAULT_SIZE,
      height: MINDMAP_IMAGE_DEFAULT_SIZE,
    });
  });
});
