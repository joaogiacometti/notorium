import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePdfReadingProgress } from "@/components/pdfs/use-pdf-reading-progress";
import type { SavePdfReadingPageForm } from "@/features/pdfs/validation";

vi.mock("@/app/actions/pdfs", () => ({ savePdfReadingPage: vi.fn() }));

class FakeReadingPageStore {
  readonly saves: SavePdfReadingPageForm[] = [];

  save = async (data: SavePdfReadingPageForm) => {
    this.saves.push(data);
    return { success: true as const, subjectId: "s1" };
  };
}

interface HarnessProps {
  page: number;
  pageCount: number;
  store: FakeReadingPageStore;
}

function ReadingHarness({ page, pageCount, store }: Readonly<HarnessProps>) {
  usePdfReadingProgress({
    pdfId: "p1",
    page,
    pageCount,
    initialPage: 3,
    save: store.save,
  });
  return null;
}

describe("usePdfReadingProgress", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement("div");
    root = createRoot(container);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function render(props: HarnessProps) {
    act(() => root.render(<ReadingHarness {...props} />));
  }

  it("saves only the page where scrolling settles", () => {
    const store = new FakeReadingPageStore();
    render({ page: 3, pageCount: 10, store });
    render({ page: 4, pageCount: 10, store });
    render({ page: 5, pageCount: 10, store });

    act(() => vi.advanceTimersByTime(1500));

    expect(store.saves).toEqual([{ id: "p1", page: 5, pageCount: 10 }]);
    act(() => root.unmount());
  });

  it("does not save the page the reader opened on", () => {
    const store = new FakeReadingPageStore();
    render({ page: 3, pageCount: 10, store });

    act(() => vi.advanceTimersByTime(1500));
    act(() => root.unmount());

    expect(store.saves).toEqual([]);
  });

  it("saves a pending page right away when the reader closes", () => {
    const store = new FakeReadingPageStore();
    render({ page: 3, pageCount: 10, store });
    render({ page: 8, pageCount: 10, store });

    act(() => root.unmount());

    expect(store.saves).toEqual([{ id: "p1", page: 8, pageCount: 10 }]);
  });
});
