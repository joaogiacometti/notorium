import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PdfReader } from "@/components/pdfs/pdf-reader";

const pdfFixture = vi.hoisted(() => ({
  numPages: 30,
  getOutline: vi.fn(),
  getDestination: vi.fn(),
  getPageIndex: vi.fn(),
  getPage: vi.fn(async () => ({
    getViewport: () => ({ width: 600, height: 800 }),
  })),
}));

interface FakeDocumentProps {
  children: ReactNode;
  onLoadSuccess: (document: typeof pdfFixture) => Promise<void>;
  onItemClick?: (destination: { pageNumber: number }) => void;
}

interface FakePageProps {
  pageNumber: number;
  renderAnnotationLayer?: boolean;
}

const pdfLinkContext = vi.hoisted(() => ({
  navigate: undefined as FakeDocumentProps["onItemClick"],
}));

function FakePdfDocument({
  children,
  onLoadSuccess,
  onItemClick,
}: FakeDocumentProps) {
  pdfLinkContext.navigate = onItemClick;
  return (
    <div>
      <button type="button" onClick={() => void onLoadSuccess(pdfFixture)}>
        Load PDF
      </button>
      {children}
    </div>
  );
}

function FakePdfPage({ pageNumber, renderAnnotationLayer }: FakePageProps) {
  return (
    <div data-rendered-page={pageNumber}>
      {renderAnnotationLayer !== false && (
        <button
          type="button"
          onClick={() =>
            pdfLinkContext.navigate?.({
              pageNumber: pageNumber === 20 ? 25 : 20,
            })
          }
        >
          Chapter link on page {pageNumber}
        </button>
      )}
    </div>
  );
}

vi.mock("react-pdf", () => ({
  Document: FakePdfDocument,
  Page: FakePdfPage,
  pdfjs: { GlobalWorkerOptions: {} },
}));
async function fakeSaveReadingPage() {
  return { success: true as const, subjectId: "subject-1" };
}

vi.mock("@/app/actions/pdfs", () => ({
  savePdfReadingPage: fakeSaveReadingPage,
}));
vi.mock("@/components/pdfs/pdf-text-crop", () => ({
  measurePdfTextCrop: vi.fn(async () => null),
}));
vi.mock("@/components/pdfs/use-pdf-study-context", () => ({
  usePdfStudyContext: vi.fn(),
}));

class FakeReaderResizeObserver {
  static current: FakeReaderResizeObserver | null = null;
  private target: Element | null = null;

  constructor(private readonly callback: ResizeObserverCallback) {}

  observe(target: Element) {
    this.target = target;
    FakeReaderResizeObserver.current = this;
    this.resize(900, 700);
  }

  resize(width: number, height: number) {
    if (!this.target) return;
    this.callback(
      [
        {
          target: this.target,
          contentRect: { width, height },
        } as ResizeObserverEntry,
      ],
      this as unknown as ResizeObserver,
    );
  }

  disconnect() {
    if (FakeReaderResizeObserver.current === this)
      FakeReaderResizeObserver.current = null;
  }
}

class DeferredPdfResult<T> {
  readonly promise: Promise<T>;
  resolve!: (result: T) => void;

  constructor() {
    this.promise = new Promise<T>((resolve) => {
      this.resolve = resolve;
    });
  }
}

describe("PDF reader links", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    pdfFixture.getOutline.mockReset();
    pdfFixture.getOutline.mockResolvedValue([
      {
        title: "Chapter twenty",
        dest: [19, { name: "Fit" }],
        items: [{ title: "Nested section", dest: "nested", items: [] }],
      },
    ]);
    pdfFixture.getDestination.mockReset();
    pdfFixture.getDestination.mockResolvedValue([{ num: 42, gen: 0 }]);
    pdfFixture.getPageIndex.mockReset();
    pdfFixture.getPageIndex.mockResolvedValue(24);
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.stubGlobal("ResizeObserver", FakeReaderResizeObserver);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  async function openReader() {
    act(() => {
      root.render(
        <PdfReader
          pdfId="pdf-1"
          title="Book"
          subjectPath="Books"
          fileUrl="/book.pdf"
          initialPage={1}
        />,
      );
    });
    await act(async () => {
      container.querySelector<HTMLButtonElement>("button")?.click();
    });
  }

  function clickReaderButton(label: string) {
    const button = Array.from(container.querySelectorAll("button")).find(
      (candidate) =>
        candidate.getAttribute("aria-label") === label ||
        candidate.textContent === label,
    );
    expect(button).toBeDefined();
    act(() => button?.click());
  }

  function readerScroller(): HTMLElement {
    const scroller = container.querySelector('[data-page-number="1"]')
      ?.parentElement?.parentElement;
    if (!scroller) throw new Error("Expected PDF scroller for page 1");
    return scroller;
  }

  it("loads contents only on demand and returns from a nested section", async () => {
    await openReader();
    expect(pdfFixture.getOutline).not.toHaveBeenCalled();
    readerScroller().scrollTop = 240;
    await act(async () => clickReaderButton("Table of contents"));
    const contents = container.querySelector(
      'nav[aria-label="Table of contents"]',
    );
    expect(contents?.textContent).toContain("Chapter twenty");
    const sidebar = contents?.closest('aside[aria-label="Table of contents"]');
    expect(sidebar).not.toBeNull();
    expect(sidebar?.nextElementSibling).toBe(readerScroller());
    expect(contents?.querySelector("ul ul")?.textContent).toContain(
      "Nested section",
    );

    await act(async () => clickReaderButton("Nested section"));

    expect(container.querySelector("input")?.value).toBe("25");
    expect(container.querySelector('nav[aria-label="Table of contents"]')).toBe(
      contents,
    );
    await act(async () => clickReaderButton("Chapter twenty"));
    expect(container.querySelector("input")?.value).toBe("20");
    clickReaderButton("Back to previous location");
    expect(container.querySelector("input")?.value).toBe("25");
    clickReaderButton("Back to previous location");
    expect(container.querySelector("input")?.value).toBe("1");
    expect(readerScroller().scrollTop).toBe(240);
  });

  it("can toggle the panel closed without navigating", async () => {
    await openReader();
    await act(async () => clickReaderButton("Table of contents"));
    clickReaderButton("Table of contents");
    expect(
      container.querySelector('nav[aria-label="Table of contents"]'),
    ).toBeNull();
    expect(container.querySelector("input")?.value).toBe("1");
  });

  it("collapses chapter sections independently of navigating", async () => {
    await openReader();
    await act(async () => clickReaderButton("Table of contents"));
    clickReaderButton("Collapse Chapter twenty sections");
    const section = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Nested section",
    );
    expect(section?.closest("[hidden]")).not.toBeNull();
    expect(container.querySelector("input")?.value).toBe("1");

    clickReaderButton("Expand Chapter twenty sections");

    expect(section?.closest("[hidden]")).toBeNull();
    await act(async () => clickReaderButton("Nested section"));
    expect(container.querySelector("input")?.value).toBe("25");
  });

  it("respects a PDF branch that starts collapsed", async () => {
    pdfFixture.getOutline.mockResolvedValue([
      {
        title: "Part one",
        dest: [19],
        count: -1,
        items: [{ title: "Section one", dest: [24], items: [] }],
      },
    ]);
    await openReader();
    await act(async () => clickReaderButton("Table of contents"));
    const section = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Section one",
    );
    expect(section?.closest("[hidden]")).not.toBeNull();
    await act(async () => clickReaderButton("Part one"));
    expect(container.querySelector("input")?.value).toBe("20");
    clickReaderButton("Expand Part one sections");
    expect(section?.closest("[hidden]")).toBeNull();
  });

  it("preserves reading and return positions when the sidebar resizes the pages", async () => {
    await openReader();
    const scroller = readerScroller();
    const firstPage = container.querySelector<HTMLElement>(
      '[data-page-number="1"]',
    );
    const originalHeight = Number.parseFloat(firstPage?.style.height ?? "0");
    act(() => {
      scroller.scrollTop = originalHeight / 4;
      scroller.dispatchEvent(new Event("scroll"));
    });
    await act(async () => clickReaderButton("Table of contents"));
    act(() => FakeReaderResizeObserver.current?.resize(636, 700));
    const sidebarHeight = Number.parseFloat(firstPage?.style.height ?? "0");
    expect(sidebarHeight).toBeLessThan(originalHeight);
    expect(scroller.scrollTop).toBeCloseTo(sidebarHeight / 4);

    await act(async () => clickReaderButton("Chapter twenty"));
    clickReaderButton("Back to previous location");
    expect(scroller.scrollTop).toBeCloseTo(sidebarHeight / 4);
    clickReaderButton("Table of contents");
    act(() => FakeReaderResizeObserver.current?.resize(900, 700));
    expect(scroller.scrollTop).toBeCloseTo(originalHeight / 4);
  });

  it("shows a loading state while reading contents", async () => {
    const pending = new DeferredPdfResult<null>();
    pdfFixture.getOutline.mockReturnValue(pending.promise);
    await openReader();
    clickReaderButton("Table of contents");
    expect(container.querySelector('[role="status"]')?.textContent).toContain(
      "Loading table of contents",
    );
    await act(async () => pending.resolve(null));
    expect(container.textContent).toContain(
      "This PDF has no embedded table of contents.",
    );
  });

  it("disables entries while resolving a destination and cancels navigation when closed", async () => {
    const pending = new DeferredPdfResult<unknown[]>();
    pdfFixture.getDestination.mockReturnValue(pending.promise);
    await openReader();
    await act(async () => clickReaderButton("Table of contents"));
    clickReaderButton("Nested section");
    const contents = container.querySelector(
      'nav[aria-label="Table of contents"]',
    );
    expect(contents?.getAttribute("aria-busy")).toBe("true");
    expect(contents?.textContent).toContain("Opening section…");
    expect(
      Array.from(
        contents?.querySelectorAll<HTMLButtonElement>(
          "button:not([aria-expanded])",
        ) ?? [],
      ).every((button) => button.disabled),
    ).toBe(true);
    clickReaderButton("Table of contents");

    await act(async () => pending.resolve([{ num: 42, gen: 0 }]));

    expect(container.querySelector("input")?.value).toBe("1");
  });

  it("preserves sections under headings without a destination", async () => {
    pdfFixture.getOutline.mockResolvedValue([
      {
        title: "Part one",
        dest: null,
        items: [{ title: "Section one", dest: [2], items: [] }],
      },
    ]);
    await openReader();
    await act(async () => clickReaderButton("Table of contents"));
    expect(
      container.querySelector('nav[aria-label="Table of contents"]')
        ?.textContent,
    ).toContain("Part one");
    await act(async () => clickReaderButton("Section one"));
    expect(container.querySelector("input")?.value).toBe("3");
  });

  it.each([null, []])(
    "explains when the PDF has no contents (%j)",
    async (outline) => {
      pdfFixture.getOutline.mockResolvedValue(outline);
      await openReader();
      await act(async () => clickReaderButton("Table of contents"));
      expect(container.textContent).toContain(
        "This PDF has no embedded table of contents.",
      );
    },
  );

  it("offers retry when contents cannot be loaded", async () => {
    pdfFixture.getOutline.mockRejectedValueOnce(
      new Error("Unreadable outline"),
    );
    await openReader();
    await act(async () => clickReaderButton("Table of contents"));
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Couldn't load",
    );

    await act(async () => clickReaderButton("Retry"));

    expect(container.textContent).toContain("Chapter twenty");
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it("keeps the reader in place when a section destination cannot be resolved", async () => {
    pdfFixture.getDestination.mockResolvedValue(null);
    await openReader();
    await act(async () => clickReaderButton("Table of contents"));
    await act(async () => clickReaderButton("Nested section"));
    expect(container.querySelector("input")?.value).toBe("1");
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Couldn't open this section",
    );

    await act(async () => clickReaderButton("Chapter twenty"));
    expect(container.querySelector("input")?.value).toBe("20");
  });

  it("returns through link jumps to the original scroll position", async () => {
    await openReader();
    expect(
      container.querySelector<HTMLButtonElement>(
        '[aria-label="Back to previous location"]',
      )?.disabled,
    ).toBe(true);
    const scroller = readerScroller();
    scroller.scrollTop = 240;
    clickReaderButton("Chapter link on page 1");
    const chapterOffset = scroller.scrollTop;
    clickReaderButton("Chapter link on page 20");
    expect(container.querySelector("input")?.value).toBe("25");

    clickReaderButton("Back to previous location");
    expect(container.querySelector("input")?.value).toBe("20");
    expect(scroller.scrollTop).toBe(chapterOffset);
    clickReaderButton("Back to previous location");
    expect(container.querySelector("input")?.value).toBe("1");
    expect(scroller.scrollTop).toBe(240);
    expect(
      container.querySelector<HTMLButtonElement>(
        '[aria-label="Back to previous location"]',
      )?.disabled,
    ).toBe(true);
  });

  it("preserves the return position when zoom changes after a link jump", async () => {
    await openReader();
    const scroller = readerScroller();
    const firstPage = container.querySelector<HTMLElement>(
      '[data-page-number="1"]',
    );
    const originalHeight = Number.parseFloat(firstPage?.style.height ?? "0");
    scroller.scrollTop = originalHeight / 4;
    clickReaderButton("Chapter link on page 1");
    clickReaderButton("Zoom in");
    const zoomedHeight = Number.parseFloat(firstPage?.style.height ?? "0");
    expect(zoomedHeight).toBeGreaterThan(originalHeight);

    clickReaderButton("Back to previous location");

    expect(scroller.scrollTop).toBeCloseTo(zoomedHeight / 4);
    expect(container.querySelector("input")?.value).toBe("1");
  });

  it("does not create return history for ordinary page navigation", async () => {
    await openReader();
    clickReaderButton("Next page");
    expect(container.querySelector("input")?.value).toBe("2");
    expect(
      container.querySelector<HTMLButtonElement>(
        '[aria-label="Back to previous location"]',
      )?.disabled,
    ).toBe(true);
  });

  it("renders embedded links and jumps to a destination outside the render window", async () => {
    await openReader();
    expect(container.querySelector('[data-rendered-page="20"]')).toBeNull();
    const chapterLink = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Chapter link on page 1",
    );
    expect(chapterLink).toBeDefined();

    act(() => chapterLink?.click());

    const destination = container.querySelector('[data-page-number="20"]');
    expect(
      destination?.querySelector('[data-rendered-page="20"]'),
    ).not.toBeNull();
    expect(container.querySelector("input")?.value).toBe("20");
    const scroller = destination?.parentElement?.parentElement;
    expect(scroller?.scrollTop).toBeGreaterThan(0);
  });
});
