import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FlashcardsHubLoadingContent } from "@/components/flashcards/flashcards-hub-loading-content";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function queryByTestId(container: HTMLElement, testId: string) {
  return container.querySelector(`[data-testid="${testId}"]`);
}

describe("FlashcardsHubLoadingContent", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
  });

  it("renders the statistics loading shell for the statistics view", async () => {
    await act(async () => {
      root.render(<FlashcardsHubLoadingContent view="statistics" />);
    });

    expect(
      queryByTestId(container, "flashcards-statistics-loading"),
    ).toBeTruthy();
  });

  it("falls back to review loading for an unknown view", async () => {
    await act(async () => {
      root.render(<FlashcardsHubLoadingContent view="unknown" />);
    });

    expect(queryByTestId(container, "flashcards-review-loading")).toBeTruthy();
  });
});
