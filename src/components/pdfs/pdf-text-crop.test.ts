import { describe, expect, it } from "vitest";
import {
  measurePdfTextCrop,
  measureTextColumn,
  type PdfCropSource,
  resolvePdfCrop,
} from "@/components/pdfs/pdf-text-crop";

// pdf.js's scale-1 viewport for an unrotated US Letter page: it flips y only.
const LETTER_VIEWPORT = {
  width: 612,
  height: 792,
  transform: [1, 0, 0, -1, 0, 792],
};

function textItem(str: string, x: number, width: number) {
  return { str, width, transform: [10, 0, 0, 10, x, 700], hasEOL: false };
}

/** Serves one line of text per page from a left edge and width. */
class FakePdfCropDocument implements PdfCropSource {
  constructor(
    private readonly lines: Record<number, [number, number] | null>,
  ) {}

  get numPages() {
    return Object.keys(this.lines).length;
  }

  async getPage(pageNumber: number) {
    const line = this.lines[pageNumber];
    return {
      getViewport: () => LETTER_VIEWPORT,
      getTextContent: async () => ({
        items: line ? [textItem("Body text", line[0], line[1])] : [],
      }),
    };
  }
}

describe("measureTextColumn", () => {
  it("spans the text and skips page numbers, blanks, and marked content", () => {
    const items = [
      textItem("Body", 90, 400),
      textItem("Line", 110, 420),
      textItem("17", 560, 10),
      textItem("  ", 10, 5),
      { type: "beginMarkedContent" },
    ];
    expect(measureTextColumn(items, LETTER_VIEWPORT)).toEqual({
      left: 90,
      right: 530,
    });
  });

  it("applies the viewport offset", () => {
    const shifted = { ...LETTER_VIEWPORT, transform: [1, 0, 0, -1, -20, 792] };
    expect(measureTextColumn([textItem("Body", 90, 400)], shifted)).toEqual({
      left: 70,
      right: 470,
    });
  });

  it("returns null for a page without text", () => {
    expect(measureTextColumn([], LETTER_VIEWPORT)).toBeNull();
  });
});

describe("resolvePdfCrop", () => {
  it("unions pages and pads the text column", () => {
    const crop = resolvePdfCrop(
      [
        { left: 108, right: 504 },
        { left: 90, right: 486 },
      ],
      612,
    );
    expect(crop?.left).toBeCloseTo((90 - 18.36) / 612);
    expect(crop?.width).toBeCloseTo((504 - 90 + 36.72) / 612);
  });

  it("skips crops that gain little or keep too little", () => {
    expect(resolvePdfCrop([{ left: 10, right: 600 }], 612)).toBeNull();
    expect(resolvePdfCrop([{ left: 250, right: 400 }], 612)).toBeNull();
  });

  it("returns null without measured text", () => {
    expect(resolvePdfCrop([null, null], 612)).toBeNull();
  });
});

describe("measurePdfTextCrop", () => {
  it("measures the opening page with its next page", async () => {
    const pdf = new FakePdfCropDocument({
      1: [72, 400],
      2: [140, 400],
      3: null,
    });
    const crop = await measurePdfTextCrop(pdf, 1);
    expect(crop?.left).toBeCloseTo((72 - 18.36) / 612);
    expect(crop?.width).toBeCloseTo((540 - 72 + 36.72) / 612);
  });

  it("uses the previous page when opening on the last one", async () => {
    const pdf = new FakePdfCropDocument({ 1: [140, 400], 2: [72, 400] });
    const crop = await measurePdfTextCrop(pdf, 2);
    expect(crop?.width).toBeCloseTo((540 - 72 + 36.72) / 612);
  });

  it("includes the middle page so a title page cannot narrow the crop", async () => {
    const pdf = new FakePdfCropDocument({
      1: [200, 200],
      2: null,
      3: [72, 468],
      4: [72, 468],
      5: [72, 468],
    });
    const crop = await measurePdfTextCrop(pdf, 1);
    expect(crop?.width).toBeCloseTo((540 - 72 + 36.72) / 612);
  });

  it("returns null for a scanned document", async () => {
    const pdf = new FakePdfCropDocument({ 1: null, 2: null });
    expect(await measurePdfTextCrop(pdf, 1)).toBeNull();
  });
});
