import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PdfReader } from "@/components/pdfs/pdf-reader";

const pdfFixture = vi.hoisted(() => ({
  numPages: 30,
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
  constructor(private readonly callback: ResizeObserverCallback) {}

  observe(target: Element) {
    this.callback(
      [
        {
          target,
          contentRect: { width: 900, height: 700 },
        } as ResizeObserverEntry,
      ],
      this as unknown as ResizeObserver,
    );
  }

  disconnect() {}
}

describe("PDF reader links", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
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
