import { describe, expect, it } from "vitest";
import {
  computePngExportFrame,
  toPngFileName,
} from "@/features/mindmaps/export-png";

describe("computePngExportFrame", () => {
  it("scales 2x and pads evenly for a small map", () => {
    const frame = computePngExportFrame({
      x: 0,
      y: 0,
      width: 400,
      height: 200,
    });

    // 400*2 + 32*2 padding = 864; 200*2 + 64 = 464.
    expect(frame).toEqual({
      width: 864,
      height: 464,
      transform: "translate(32px, 32px) scale(2)",
    });
  });

  it("offsets the transform by the bounds origin so off-origin maps are framed", () => {
    const frame = computePngExportFrame({
      x: -100,
      y: 50,
      width: 200,
      height: 100,
    });

    // x: -(-100)*2 + 32 = 232; y: -(50)*2 + 32 = -68.
    expect(frame.transform).toBe("translate(232px, -68px) scale(2)");
  });

  it("reduces the scale so a huge map stays within the dimension cap", () => {
    const frame = computePngExportFrame({
      x: 0,
      y: 0,
      width: 100000,
      height: 1000,
    });

    expect(frame.width).toBeLessThanOrEqual(8000);
    expect(frame.height).toBeLessThanOrEqual(8000);
    // Scale must drop below the default 2x to fit.
    expect(frame.transform).toContain("scale(0.0");
  });
});

describe("toPngFileName", () => {
  it("slugifies a title into a png filename", () => {
    expect(toPngFileName("Cell Biology 101")).toBe("cell-biology-101.png");
  });

  it("collapses punctuation and trims dashes", () => {
    expect(toPngFileName("  Heat → Expansion!! ")).toBe("heat-expansion.png");
  });

  it("falls back to mindmap for an empty or symbol-only title", () => {
    expect(toPngFileName("   ")).toBe("mindmap.png");
    expect(toPngFileName("!!!")).toBe("mindmap.png");
  });
});
