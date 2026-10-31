import { act, createRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PDF_FIT_WIDTH } from "@/components/pdfs/pdf-page-layout";
import { PdfReaderToolbar } from "@/components/pdfs/pdf-reader-toolbar";

describe("PDF reading controls", () => {
  let container: HTMLDivElement;
  let root: Root;
  const onZoomChange = vi.fn();
  const onGoBack = vi.fn();
  const onPageJump = vi.fn();

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.clearAllMocks();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function renderToolbar(zoomRatio = 1, canGoBack = true) {
    act(() =>
      root.render(
        <PdfReaderToolbar
          currentPage={2}
          pageCount={30}
          zoom={PDF_FIT_WIDTH}
          zoomRatio={zoomRatio}
          onZoomChange={onZoomChange}
          onPageJump={onPageJump}
          canGoBack={canGoBack}
          onGoBack={onGoBack}
          contentsOpen={false}
          contentsToggleRef={createRef()}
          onToggleContents={vi.fn()}
          trimMargins
          canTrimMargins
          onTrimMarginsChange={vi.fn()}
        />,
      ),
    );
  }

  async function openReadingMenu() {
    const trigger = container.querySelector<HTMLButtonElement>(
      '[aria-label="Zoom presets"]',
    );
    await act(async () => {
      trigger?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
      );
    });
  }

  function menuItem(label: string): HTMLElement {
    const item = Array.from(
      document.querySelectorAll<HTMLElement>('[role="menuitem"]'),
    ).find((candidate) => candidate.textContent?.trim() === label);
    if (!item) throw new Error(`Expected menu item with label "${label}"`);
    return item;
  }

  it.each([
    ["Zoom in", 1.25],
    ["Zoom out", 0.75],
  ] as const)(
    "offers %s from the compact reading menu",
    async (label, ratio) => {
      renderToolbar();
      await openReadingMenu();
      act(() => menuItem(label).click());
      expect(onZoomChange).toHaveBeenCalledWith({ kind: "ratio", ratio });
    },
  );

  it("keeps return navigation in the toolbar, not the zoom menu", async () => {
    renderToolbar();
    const back = container.querySelector<HTMLButtonElement>(
      '[aria-label="Back to previous location"]',
    );
    expect(back?.disabled).toBe(false);
    act(() => back?.click());
    expect(onGoBack).toHaveBeenCalledOnce();
    await openReadingMenu();
    expect(
      Array.from(document.querySelectorAll('[role="menuitem"]')).some((item) =>
        item.textContent?.includes("Back to previous location"),
      ),
    ).toBe(false);
  });

  it.each([
    [0.25, "Zoom out"],
    [4, "Zoom in"],
  ] as const)("disables zoom beyond the %s limit", async (ratio, label) => {
    renderToolbar(ratio, false);
    await openReadingMenu();
    expect(menuItem(label).getAttribute("aria-disabled")).toBe("true");
  });

  it("keeps previous and next page navigation available", () => {
    renderToolbar();
    act(() =>
      container
        .querySelector<HTMLButtonElement>('[aria-label="Previous page"]')
        ?.click(),
    );
    expect(onPageJump).toHaveBeenLastCalledWith(1);
    act(() =>
      container
        .querySelector<HTMLButtonElement>('[aria-label="Next page"]')
        ?.click(),
    );
    expect(onPageJump).toHaveBeenLastCalledWith(3);
  });
});
