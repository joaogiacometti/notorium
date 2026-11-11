import { describe, expect, it } from "vitest";
import {
  measurePageText,
  measurePdfTextCrop,
  type PageText,
  type PdfCropSource,
  resolvePageRows,
  resolvePdfTextCrop,
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

const LINE_PITCH = 14;

function textLine(baseline: number, fontHeight = 10, left = 90, right = 522) {
  return { left, right, top: baseline - fontHeight, baseline, fontHeight };
}

/** A Letter page of body lines between two baselines, under optional lines. */
function bodyPage(
  from = 100,
  to = 688,
  above: ReturnType<typeof textLine>[] = [],
): PageText {
  const lines = [...above];
  for (let baseline = from; baseline <= to; baseline += LINE_PITCH) {
    lines.push(textLine(baseline));
  }
  return { width: 612, height: 792, lines };
}

const BLANK_PAGE: PageText = { width: 612, height: 792, lines: [] };
const ROWS_PADDING = 792 * 0.015;

describe("measurePageText", () => {
  it("groups text into lines and skips page numbers, blanks, and marked content", () => {
    const items = [
      textItem("Body", 90, 400),
      textItem("text", 500, 30),
      { str: "Next line", width: 420, transform: [10, 0, 0, 10, 110, 686] },
      textItem("17", 560, 10),
      textItem("  ", 10, 5),
      { type: "beginMarkedContent" },
    ];
    expect(measurePageText(items, LETTER_VIEWPORT).lines).toEqual([
      { left: 90, right: 530, top: 82, baseline: 92, fontHeight: 10 },
      { left: 110, right: 530, top: 96, baseline: 106, fontHeight: 10 },
    ]);
  });

  it("keeps a raised mark on the line it belongs to", () => {
    const items = [
      textItem("Body", 90, 400),
      { str: "a", width: 4, transform: [6, 0, 0, 6, 490, 704] },
    ];
    expect(measurePageText(items, LETTER_VIEWPORT).lines).toHaveLength(1);
  });

  it("applies the viewport offset", () => {
    const shifted = { ...LETTER_VIEWPORT, transform: [1, 0, 0, -1, -20, 792] };
    const [line] = measurePageText([textItem("Body", 90, 400)], shifted).lines;
    expect(line).toMatchObject({ left: 70, right: 470 });
  });

  it("has no lines for a page without text", () => {
    expect(measurePageText([], LETTER_VIEWPORT).lines).toEqual([]);
  });
});

describe("resolvePdfTextCrop", () => {
  it("unions pages and pads the text column", () => {
    const crop = resolvePdfTextCrop([
      { ...BLANK_PAGE, lines: [textLine(92, 10, 108, 504)] },
      { ...BLANK_PAGE, lines: [textLine(92, 10, 90, 486)] },
    ])?.crop;
    expect(crop?.left).toBeCloseTo((90 - 18.36) / 612);
    expect(crop?.width).toBeCloseTo((504 - 90 + 36.72) / 612);
  });

  it("skips crops that gain little or keep too little", () => {
    expect(
      resolvePdfTextCrop([
        { ...BLANK_PAGE, lines: [textLine(92, 10, 10, 600)] },
      ]),
    ).toBeNull();
    expect(
      resolvePdfTextCrop([
        { ...BLANK_PAGE, lines: [textLine(92, 10, 250, 400)] },
      ]),
    ).toBeNull();
  });

  it("returns null without measured text", () => {
    expect(resolvePdfTextCrop([BLANK_PAGE, BLANK_PAGE])).toBeNull();
  });

  it("trims the margins above and below the tallest text block", () => {
    const crop = resolvePdfTextCrop([bodyPage(100, 400), bodyPage()])?.crop;
    expect(crop?.top).toBeCloseTo((90 - ROWS_PADDING) / 792);
    expect((crop?.top ?? 0) + (crop?.height ?? 0)).toBeCloseTo(
      (688 + ROWS_PADDING) / 792,
    );
  });

  it("trims a running head that repeats across pages", () => {
    const textCrop = resolvePdfTextCrop([
      bodyPage(100, 688, [textLine(50, 9, 90, 300)]),
      bodyPage(100, 688, [textLine(50, 9, 300, 522)]),
    ]);
    expect(textCrop?.runningHead).toBe(50);
    expect(textCrop?.crop.top).toBeCloseTo((90 - ROWS_PADDING) / 792);
  });

  it("keeps a line that opens only one page", () => {
    const textCrop = resolvePdfTextCrop([
      bodyPage(100, 688, [textLine(50)]),
      bodyPage(),
    ]);
    expect(textCrop?.runningHead).toBeNull();
    expect(textCrop?.crop.top).toBeCloseTo((40 - ROWS_PADDING) / 792);
  });

  it("keeps repeated titles set larger than the body, as on slides", () => {
    const title = textLine(60, 24);
    const textCrop = resolvePdfTextCrop([
      bodyPage(110, 684, [title]),
      bodyPage(110, 684, [title]),
    ]);
    expect(textCrop?.runningHead).toBeNull();
    expect(textCrop?.crop.top).toBeCloseTo((36 - ROWS_PADDING) / 792);
  });
});

describe("resolvePageRows", () => {
  const runningHead = textLine(50, 9);
  const textCrop = resolvePdfTextCrop([
    bodyPage(100, 604, [runningHead]),
    bodyPage(100, 604, [runningHead]),
  ]);
  if (!textCrop) throw new Error("Expected a text crop");
  const shared = { top: textCrop.crop.top, height: textCrop.crop.height };

  it("uses the shared rows for a page inside them", () => {
    const rows = resolvePageRows(textCrop, bodyPage(100, 300, [runningHead]));
    expect(rows).toEqual(shared);
  });

  it("widens the rows to text the shared crop would cut", () => {
    const rows = resolvePageRows(textCrop, bodyPage(70, 714));
    expect(rows.top).toBeCloseTo((60 - ROWS_PADDING) / 792);
    expect(rows.top + rows.height).toBeCloseTo((714 + ROWS_PADDING) / 792);
  });

  it("shows the whole height of a page without text", () => {
    expect(resolvePageRows(textCrop, BLANK_PAGE)).toMatchObject({
      top: 0,
      height: 1,
    });
  });
});

describe("measurePdfTextCrop", () => {
  it("measures the opening page with its next page", async () => {
    const pdf = new FakePdfCropDocument({
      1: [72, 400],
      2: [140, 400],
      3: null,
    });
    const crop = (await measurePdfTextCrop(pdf, 1))?.crop;
    expect(crop?.left).toBeCloseTo((72 - 18.36) / 612);
    expect(crop?.width).toBeCloseTo((540 - 72 + 36.72) / 612);
  });

  it("uses the previous page when opening on the last one", async () => {
    const pdf = new FakePdfCropDocument({ 1: [140, 400], 2: [72, 400] });
    const crop = (await measurePdfTextCrop(pdf, 2))?.crop;
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
    const crop = (await measurePdfTextCrop(pdf, 1))?.crop;
    expect(crop?.width).toBeCloseTo((540 - 72 + 36.72) / 612);
  });

  it("returns null for a scanned document", async () => {
    const pdf = new FakePdfCropDocument({ 1: null, 2: null });
    expect(await measurePdfTextCrop(pdf, 1)).toBeNull();
  });
});
