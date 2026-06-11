import { describe, expect, it, vi } from "vitest";
import {
  computePngExportFrame,
  inlineLoadedImages,
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

describe("inlineLoadedImages", () => {
  function makeImg(
    src: string,
    complete: boolean,
    naturalWidth: number,
  ): HTMLImageElement {
    const img = document.createElement("img");
    Object.defineProperty(img, "complete", { value: complete });
    Object.defineProperty(img, "naturalWidth", { value: naturalWidth });
    img.src = src;
    return img;
  }

  function makeViewport(imgs: HTMLImageElement[]): HTMLElement {
    const div = document.createElement("div");
    for (const img of imgs) div.appendChild(img);
    return div;
  }

  it("replaces src with data URL for a loaded image and restores it", async () => {
    const originalCreateElement = document.createElement.bind(document);
    const drawImage = vi.fn();
    const toDataURL = vi.fn().mockReturnValue("data:image/png;base64,abc");
    vi.spyOn(document, "createElement").mockImplementation((tag) => {
      if (tag === "canvas") {
        return {
          width: 0,
          height: 0,
          getContext: () => ({ drawImage }),
          toDataURL,
        } as unknown as HTMLCanvasElement;
      }
      return originalCreateElement(tag);
    });

    const img = makeImg("https://example.com/image.png", true, 100);
    const viewport = makeViewport([img]);

    const restore = await inlineLoadedImages(viewport);
    expect(img.src).toBe("data:image/png;base64,abc");

    restore();
    expect(img.src).toBe("https://example.com/image.png");

    vi.restoreAllMocks();
  });

  it("skips images that are not yet loaded (complete=false)", async () => {
    const img = makeImg("https://example.com/a.png", false, 100);
    const viewport = makeViewport([img]);

    const restore = await inlineLoadedImages(viewport);
    expect(img.src).toBe("https://example.com/a.png");
    restore();
  });

  it("replaces broken images (naturalWidth=0) with a transparent placeholder", async () => {
    const img = makeImg("https://example.com/broken.png", true, 0);
    const viewport = makeViewport([img]);

    const restore = await inlineLoadedImages(viewport);
    expect(img.src).toMatch(/^data:image\/png;base64,/);

    restore();
    expect(img.src).toBe("https://example.com/broken.png");
  });

  it("skips an image when canvas drawing throws", async () => {
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag) => {
      if (tag === "canvas") {
        return {
          width: 0,
          height: 0,
          getContext: () => ({
            drawImage: () => {
              throw new Error("tainted");
            },
          }),
          toDataURL: vi.fn(),
        } as unknown as HTMLCanvasElement;
      }
      return originalCreateElement(tag);
    });

    const img = makeImg("https://example.com/c.png", true, 50);
    const viewport = makeViewport([img]);

    await expect(inlineLoadedImages(viewport)).resolves.toBeDefined();
    expect(img.src).toBe("https://example.com/c.png");

    vi.restoreAllMocks();
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
