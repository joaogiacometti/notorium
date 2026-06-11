import { getNodesBounds, type Node } from "@xyflow/react";
import { toPng } from "html-to-image";

/** Output frame for a PNG export: pixel dimensions plus the CSS transform that
 * positions the React Flow viewport so every node is centered with padding. */
export interface PngExportFrame {
  width: number;
  height: number;
  transform: string;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Render at 2x for crisp node text; pad evenly so nodes never touch the edge.
const EXPORT_SCALE = 2;
const EXPORT_PADDING_PX = 32;
// Transparent 1×1 PNG used in place of broken images during export so that
// html-to-image never sees an empty src, which would trigger onerror → reject.
const TRANSPARENT_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAABjE+ibYAAAAASUVORK5CYII=";
// Cap the longest side so a huge map cannot produce a multi-hundred-megapixel
// canvas that exhausts memory; the scale is reduced to fit instead.
const MAX_DIMENSION_PX = 8000;
const VIEWPORT_SELECTOR = ".react-flow__viewport";

/**
 * Frames the given node bounds into an output canvas: scales up for crispness,
 * reduces the scale for very large maps so the PNG stays within MAX_DIMENSION_PX,
 * and pads evenly. Exported for unit testing the framing math.
 *
 * @example computePngExportFrame({ x: 0, y: 0, width: 400, height: 200 });
 */
export function computePngExportFrame(bounds: Rect): PngExportFrame {
  const available = MAX_DIMENSION_PX - EXPORT_PADDING_PX * 2;
  const scale = Math.min(
    EXPORT_SCALE,
    available / Math.max(bounds.width, 1),
    available / Math.max(bounds.height, 1),
  );
  const width = Math.ceil(bounds.width * scale + EXPORT_PADDING_PX * 2);
  const height = Math.ceil(bounds.height * scale + EXPORT_PADDING_PX * 2);
  const x = -bounds.x * scale + EXPORT_PADDING_PX;
  const y = -bounds.y * scale + EXPORT_PADDING_PX;
  return {
    width,
    height,
    transform: `translate(${x}px, ${y}px) scale(${scale})`,
  };
}

/** Slugify a mindmap title into a safe PNG filename, falling back to "mindmap". */
export function toPngFileName(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "mindmap"}.png`;
}

/** Trigger a browser download for an image data URL. */
function downloadDataUrl(dataUrl: string, fileName: string): void {
  const link = document.createElement("a");
  link.download = fileName;
  link.href = dataUrl;
  link.click();
}

// SVG elements whose paint comes from a base.css class rule or a CSS variable
// resolved on an ancestor of the captured viewport. html-to-image renders the
// clone in isolation, where neither the stylesheet nor those variables apply,
// so these must be pinned to a concrete color first.
const EDGE_PAINT_SELECTORS: Array<{ selector: string; props: string[] }> = [
  { selector: ".react-flow__edge-path", props: ["stroke", "stroke-width"] },
  { selector: ".react-flow__arrowhead polyline", props: ["stroke", "fill"] },
];

/**
 * Inlines the computed stroke/fill of every connection line and arrowhead so the
 * isolated export render keeps them visible. Returns a function that restores
 * the previous inline values. Without this the lines disappear (SVG `stroke`
 * falls back to its initial value of "none" in the cloned subtree).
 */
function pinEdgeColors(viewport: HTMLElement): () => void {
  const restores: Array<() => void> = [];
  for (const { selector, props } of EDGE_PAINT_SELECTORS) {
    for (const element of viewport.querySelectorAll<SVGElement>(selector)) {
      const computed = getComputedStyle(element);
      for (const prop of props) {
        const previous = element.style.getPropertyValue(prop);
        element.style.setProperty(prop, computed.getPropertyValue(prop));
        restores.push(() =>
          previous
            ? element.style.setProperty(prop, previous)
            : element.style.removeProperty(prop),
        );
      }
    }
  }
  return () => {
    for (const restore of restores) {
      restore();
    }
  };
}

/**
 * Converts every already-loaded <img> inside the viewport to a data URL by
 * drawing to a temporary canvas, then sets the element's src to that data URL.
 * Returns a function that restores all original src values.
 *
 * html-to-image skips elements whose src is already a data URL, so this
 * prevents the library from making additional network fetches for attachment
 * images. Those fetches would fail (or return the wrong result) because
 * html-to-image's internal cache strips query parameters and maps all
 * /api/attachments/blob?pathname=… URLs to the same cache key.
 *
 * @example const restore = await inlineLoadedImages(viewport);
 */
export async function inlineLoadedImages(
  viewport: HTMLElement,
): Promise<() => void> {
  const imgs = Array.from(viewport.querySelectorAll<HTMLImageElement>("img"));
  const restores: Array<() => void> = [];

  await Promise.all(
    imgs.map(async (img) => {
      if (!img.complete) {
        return;
      }

      const previous = img.src;

      if (img.naturalWidth === 0) {
        // Broken image (404 or invalid URL). Replace with a transparent
        // placeholder so html-to-image never receives an empty src, which
        // would trigger its onerror → reject and crash the whole export.
        img.src = TRANSPARENT_PNG;
        restores.push(() => {
          img.src = previous;
        });
        return;
      }

      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL();
        img.src = dataUrl;
        restores.push(() => {
          img.src = previous;
        });
      } catch {
        // Canvas taint or other draw failure — leave the src unchanged.
      }
    }),
  );

  return () => {
    for (const restore of restores) {
      restore();
    }
  };
}

/**
 * Rasterizes the live mindmap canvas to a PNG and downloads it. Uses the live
 * React Flow nodes (which carry measured sizes) to frame the whole map, so call
 * it from inside the canvas. Throws when the map is empty or the viewport
 * element is missing so the caller can surface a failure toast. Pass the
 * canvas wrapper as `root` so that, when several canvases are mounted (e.g. an
 * offscreen export render next to the open editor), the right one is captured.
 *
 * @example await exportMindmapToPng(getNodes(), "biology.png", "#ffffff", wrapper);
 */
export async function exportMindmapToPng(
  nodes: Node[],
  fileName: string,
  backgroundColor: string,
  root: ParentNode = document,
): Promise<void> {
  if (nodes.length === 0) {
    throw new Error("Cannot export an empty mindmap");
  }
  const viewport = root.querySelector<HTMLElement>(VIEWPORT_SELECTOR);
  if (!viewport) {
    throw new Error(`Mindmap viewport "${VIEWPORT_SELECTOR}" not found`);
  }
  const frame = computePngExportFrame(getNodesBounds(nodes));
  const restoreEdgeColors = pinEdgeColors(viewport);
  const restoreImages = await inlineLoadedImages(viewport);
  try {
    const dataUrl = await toPng(viewport, {
      backgroundColor,
      width: frame.width,
      height: frame.height,
      // Scale is already baked into the frame; keep pixelRatio at 1 so a
      // high-DPI screen does not multiply the dimensions a second time.
      pixelRatio: 1,
      // Include query params in the cache key so that different attachment
      // images (same base URL, different ?pathname=…) are not conflated.
      includeQueryParams: true,
      style: {
        width: `${frame.width}px`,
        height: `${frame.height}px`,
        transform: frame.transform,
      },
    });
    downloadDataUrl(dataUrl, fileName);
  } finally {
    restoreEdgeColors();
    restoreImages();
  }
}
