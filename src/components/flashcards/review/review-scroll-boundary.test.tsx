import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ReviewScrollBoundary } from "@/components/flashcards/review/review-scroll-boundary";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

describe("ReviewScrollBoundary", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    document.body.style.removeProperty("overflow");
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false });
  });

  it("portals the session outside page containers and restores scrolling on exit", async () => {
    await renderSession(false);
    expect(container.textContent).not.toContain("Review content");
    expect(document.body.textContent).toContain("Review content");
    expect(getComputedStyle(document.body).overflow).toBe("hidden");

    await act(async () => root.render(null));
    expect(getComputedStyle(document.body).overflow).not.toBe("hidden");
  });

  it("keeps the session locked when a nested dialog closes", async () => {
    await renderSession(true);
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    expect(getComputedStyle(document.body).overflow).toBe("hidden");

    await renderSession(false);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(getComputedStyle(document.body).overflow).toBe("hidden");

    await act(async () => root.render(null));
    expect(getComputedStyle(document.body).overflow).not.toBe("hidden");
  });

  it("preserves existing page overflow styles", async () => {
    document.body.style.overflow = "auto";
    await renderSession(false);
    await act(async () => root.render(null));
    expect(document.body.style.overflow).toBe("auto");
  });

  async function renderSession(dialogOpen: boolean): Promise<void> {
    await act(async () => {
      root.render(
        <ReviewScrollBoundary>
          <div>Review content</div>
          <Dialog open={dialogOpen}>
            <DialogContent aria-describedby={undefined}>
              <DialogTitle>Edit card</DialogTitle>
            </DialogContent>
          </Dialog>
        </ReviewScrollBoundary>,
      );
    });
  }
});
