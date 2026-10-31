import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PdfTableOfContents } from "@/components/pdfs/pdf-table-of-contents";

interface FakeContentsItem {
  title: string;
  dest: unknown;
  items: FakeContentsItem[];
}

class DeferredContentsValue<T> {
  readonly promise: Promise<T>;
  resolve!: (value: T) => void;
  reject!: (reason: Error) => void;

  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
}

class FakeContentsSource {
  numPages = 30;
  outlines: Promise<FakeContentsItem[] | null>[];
  destination = new DeferredContentsValue<unknown[] | null>();

  constructor(title: string) {
    this.outlines = [Promise.resolve([{ title, dest: "chapter", items: [] }])];
  }

  getOutline(): Promise<FakeContentsItem[] | null> {
    const outline = this.outlines.shift();
    if (!outline) throw new Error("Expected a queued fake PDF outline");
    return outline;
  }

  getDestination(): Promise<unknown[] | null> {
    return this.destination.promise;
  }

  async getPageIndex(): Promise<number> {
    return 4;
  }
}

describe("PDF contents request isolation", () => {
  let container: HTMLDivElement;
  let root: Root;
  const navigate = vi.fn();

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    navigate.mockClear();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  async function renderContents(source: FakeContentsSource, strict = false) {
    await act(async () => {
      const panel = (
        <PdfTableOfContents pdfDocument={source} onNavigate={navigate} />
      );
      root.render(strict ? <StrictMode>{panel}</StrictMode> : panel);
    });
  }

  it("ignores an outline from an earlier StrictMode effect", async () => {
    const stale = new DeferredContentsValue<FakeContentsItem[] | null>();
    const source = new FakeContentsSource("Current chapter");
    source.outlines.unshift(stale.promise);
    await renderContents(source, true);
    expect(container.textContent).toContain("Current chapter");

    await act(async () =>
      stale.resolve([{ title: "Stale chapter", dest: [1], items: [] }]),
    );

    expect(container.textContent).toContain("Current chapter");
    expect(container.textContent).not.toContain("Stale chapter");
  });

  it("ignores an outline rejection from a replaced document", async () => {
    const stale = new DeferredContentsValue<FakeContentsItem[] | null>();
    const original = new FakeContentsSource("Old chapter");
    original.outlines = [stale.promise];
    await renderContents(original);
    await renderContents(new FakeContentsSource("New chapter"));

    await act(async () => stale.reject(new Error("Old outline failed")));

    expect(container.textContent).toContain("New chapter");
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it.each(["resolve", "reject"] as const)(
    "ignores a stale destination %s after replacing the document",
    async (outcome) => {
      const original = new FakeContentsSource("Old chapter");
      await renderContents(original);
      act(() =>
        container.querySelector<HTMLButtonElement>("nav button")?.click(),
      );
      await renderContents(new FakeContentsSource("New chapter"));

      await act(async () => {
        if (outcome === "resolve") original.destination.resolve([19]);
        else original.destination.reject(new Error("Old destination failed"));
      });

      expect(navigate).not.toHaveBeenCalled();
      expect(container.textContent).toContain("New chapter");
      expect(container.querySelector('[role="alert"]')).toBeNull();
      expect(
        container.querySelector<HTMLButtonElement>("nav button")?.disabled,
      ).toBe(false);
    },
  );
});
