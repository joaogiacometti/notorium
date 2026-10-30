import { describe, expect, it } from "vitest";
import {
  actualSizeRatio,
  buildPageTops,
  clampPdfZoom,
  findPageAtOffset,
  PDF_FIT_PAGE,
  pageRenderPixelRatio,
  parsePageInput,
  resolvePageWidth,
  scrollAnchorAt,
  scrollOffsetOf,
  stepPdfZoom,
} from "@/components/pdfs/pdf-page-layout";

describe("buildPageTops", () => {
  it("stacks pages with a gap between them", () => {
    expect(buildPageTops([100, 200, 50], 10)).toEqual([0, 110, 320]);
  });
});

describe("findPageAtOffset", () => {
  const tops = [0, 110, 320];

  it.each([
    [-5, 1],
    [0, 1],
    [109, 1],
    [110, 2],
    [319, 2],
    [5000, 3],
  ])("offset %i is on page %i", (offset, page) => {
    expect(findPageAtOffset(tops, offset)).toBe(page);
  });
});

describe("stepPdfZoom", () => {
  it("moves along the 25% ladder", () => {
    expect(stepPdfZoom(1, 1)).toBe(1.25);
    expect(stepPdfZoom(1, -1)).toBe(0.75);
  });

  it("snaps an in-between pinch zoom to the next round value", () => {
    expect(stepPdfZoom(1.1, 1)).toBe(1.25);
    expect(stepPdfZoom(1.1, -1)).toBe(1);
  });

  it("stays within the zoom bounds", () => {
    expect(stepPdfZoom(4, 1)).toBe(4);
    expect(stepPdfZoom(0.25, -1)).toBe(0.25);
  });
});

describe("clampPdfZoom", () => {
  it("bounds pinch results", () => {
    expect(clampPdfZoom(10)).toBe(4);
    expect(clampPdfZoom(0.1)).toBe(0.25);
  });
});

describe("parsePageInput", () => {
  it("clamps typed pages into the document", () => {
    expect(parsePageInput("0", 10)).toBe(1);
    expect(parsePageInput("42", 10)).toBe(10);
    expect(parsePageInput("7", 10)).toBe(7);
  });

  it("rejects text", () => {
    expect(parsePageInput("abc", 10)).toBeNull();
  });
});

describe("scroll anchors", () => {
  it("keeps the same spot of the same page across a zoom", () => {
    const before = { tops: [0, 110, 220], heights: [100, 100, 100] };
    const after = { tops: [0, 210, 420], heights: [200, 200, 200] };

    const anchor = scrollAnchorAt(before, 135);

    expect(anchor).toEqual({ page: 2, fraction: 0.25 });
    expect(scrollOffsetOf(after, anchor)).toBe(260);
  });

  it("clamps an anchor in the gap below a page to its end", () => {
    const layout = { tops: [0, 110], heights: [100, 100] };

    expect(scrollAnchorAt(layout, 105)).toEqual({ page: 1, fraction: 1 });
  });

  it("opens a saved page beyond the document at its last page", () => {
    const layout = { tops: [0, 110], heights: [100, 100] };

    expect(scrollOffsetOf(layout, { page: 9, fraction: 0 })).toBe(110);
  });
});

describe("resolvePageWidth", () => {
  const page = { width: 500, height: 700 };
  const desktop = { columnWidth: 1400, columnHeight: 732, padding: 16 };
  const phone = { columnWidth: 390, columnHeight: 700, padding: 16 };

  it("fits the whole page in a wide column", () => {
    expect(resolvePageWidth(PDF_FIT_PAGE, desktop, page)).toBe(500);
  });

  it("fits the page to the width of a narrow column", () => {
    expect(resolvePageWidth(PDF_FIT_PAGE, phone, page)).toBe(358);
  });

  it("fills the column width in page-width mode", () => {
    expect(
      resolvePageWidth({ kind: "fit", mode: "width" }, desktop, page),
    ).toBe(1368);
  });

  it("sizes a ratio against the page's actual size in CSS pixels", () => {
    expect(resolvePageWidth({ kind: "ratio", ratio: 1 }, desktop, page)).toBe(
      666,
    );
  });

  it("is zero before the column is measured", () => {
    const unmeasured = { columnWidth: 0, columnHeight: 0, padding: 16 };
    expect(resolvePageWidth(PDF_FIT_PAGE, unmeasured, page)).toBe(0);
  });
});

describe("actualSizeRatio", () => {
  it("reports a page drawn at its printed size as 100%", () => {
    expect(actualSizeRatio(816, { width: 612, height: 792 })).toBe(1);
  });
});

describe("pageRenderPixelRatio", () => {
  it("uses the device ratio for normal page sizes", () => {
    expect(pageRenderPixelRatio(800, 1100, 2)).toBe(2);
  });

  it("caps very dense screens at 2", () => {
    expect(pageRenderPixelRatio(800, 1100, 3)).toBe(2);
  });

  it("lowers the ratio so a zoomed canvas stays under the pixel limit", () => {
    const ratio = pageRenderPixelRatio(3000, 4200, 2);
    expect(3000 * 4200 * ratio ** 2).toBeLessThanOrEqual(16_000_000);
  });
});
