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
  const onPageTintChange = vi.fn();
  const onTrimMarginsChange = vi.fn();

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
          onTrimMarginsChange={onTrimMarginsChange}
          pageTint="original"
          onPageTintChange={onPageTintChange}
        />,
      ),
    );
  }

  async function openMenu(label: string) {
    const trigger = container.querySelector<HTMLButtonElement>(
      `[aria-label="${label}"]`,
    );
    await act(async () => {
      trigger?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
      );
    });
  }

  function viewSettings(): HTMLElement | null {
    return document.querySelector<HTMLElement>('[data-slot="popover-content"]');
  }

  function openViewSettings() {
    act(() =>
      container
        .querySelector<HTMLButtonElement>('[aria-label="View settings"]')
        ?.click(),
    );
  }

  // The name a screen reader announces: decorative samples are left out.
  function accessibleName(element: HTMLElement): string {
    const label = element.getAttribute("aria-label");
    if (label) return label;
    const copy = element.cloneNode(true) as HTMLElement;
    for (const hidden of copy.querySelectorAll("[aria-hidden]")) {
      hidden.remove();
    }
    return copy.textContent?.trim() ?? "";
  }

  function settingsButton(label: string): HTMLButtonElement {
    const button = Array.from(
      viewSettings()?.querySelectorAll<HTMLButtonElement>("button") ?? [],
    ).find((candidate) => accessibleName(candidate) === label);
    if (!button) throw new Error(`Expected view setting "${label}"`);
    return button;
  }

  it.each([
    ["Zoom in", 1.25],
    ["Zoom out", 0.75],
  ] as const)("offers %s from the compact view settings", (label, ratio) => {
    renderToolbar();
    openViewSettings();
    act(() => settingsButton(label).click());
    expect(onZoomChange).toHaveBeenCalledWith({ kind: "ratio", ratio });
  });

  it("offers page colors from view settings and stays open to compare them", () => {
    renderToolbar();
    openViewSettings();
    act(() => settingsButton("Sepia").click());
    expect(onPageTintChange).toHaveBeenCalledWith("sepia");
    expect(settingsButton("Original").getAttribute("aria-pressed")).toBe(
      "true",
    );
    act(() => settingsButton("Dark").click());
    expect(onPageTintChange).toHaveBeenLastCalledWith("dark");
  });

  it("switches margin trimming from view settings", () => {
    renderToolbar();
    openViewSettings();
    act(() =>
      viewSettings()?.querySelector<HTMLElement>('[role="switch"]')?.click(),
    );
    expect(onTrimMarginsChange).toHaveBeenCalledWith(false);
  });

  it("keeps the zoom menu to zoom presets", async () => {
    renderToolbar();
    await openMenu("Zoom presets");
    expect(
      Array.from(
        document.querySelectorAll<HTMLElement>('[role^="menuitem"]'),
      ).map((item) => item.textContent?.trim()),
    ).toEqual(["Page fit", "Page width", "Actual size"]);
  });

  it("keeps return navigation in the toolbar", () => {
    renderToolbar();
    const back = container.querySelector<HTMLButtonElement>(
      '[aria-label="Back to previous location"]',
    );
    expect(back?.disabled).toBe(false);
    act(() => back?.click());
    expect(onGoBack).toHaveBeenCalledOnce();
  });

  it.each([
    [0.25, "Zoom out"],
    [4, "Zoom in"],
  ] as const)("disables zoom beyond the %s limit", (ratio, label) => {
    renderToolbar(ratio, false);
    openViewSettings();
    expect(settingsButton(label).disabled).toBe(true);
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
