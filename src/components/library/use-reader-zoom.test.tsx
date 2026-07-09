import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

type LayoutReadyEvent = {
  documentId: string;
  isInitial: boolean;
};

const mocks = vi.hoisted(() => {
  const state: {
    layoutReadyListener: ((event: LayoutReadyEvent) => void) | null;
    zoomLevel: string | number;
  } = {
    layoutReadyListener: null,
    zoomLevel: "automatic",
  };

  const updateBookZoomMock = vi.fn();
  const requestZoomMock = vi.fn();
  const onLayoutReadyMock = vi.fn(
    (listener: (event: LayoutReadyEvent) => void) => {
      state.layoutReadyListener = listener;
      return vi.fn();
    },
  );

  return {
    state,
    updateBookZoomMock,
    requestZoomMock,
    onLayoutReadyMock,
  };
});

vi.mock("@/app/actions/library", () => ({
  updateBookZoom: mocks.updateBookZoomMock,
}));

vi.mock("@embedpdf/plugin-scroll/react", () => ({
  useScrollCapability: () => ({
    provides: {
      onLayoutReady: mocks.onLayoutReadyMock,
    },
  }),
}));

vi.mock("@embedpdf/plugin-zoom", () => ({
  ZoomMode: {
    FitPage: "fit-page",
  },
}));

vi.mock("@embedpdf/plugin-zoom/react", () => ({
  useZoom: () => ({
    state: { zoomLevel: mocks.state.zoomLevel },
    provides: { requestZoom: mocks.requestZoomMock },
  }),
}));

import { useReaderZoom } from "@/components/library/use-reader-zoom";

function ReaderZoomHarness() {
  useReaderZoom({
    documentId: "document-1",
    bookId: "book-1",
    initialZoomMobile: null,
    initialZoomDesktop: "1.5",
  });

  return null;
}

describe("useReaderZoom", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    mocks.state.layoutReadyListener = null;
    mocks.state.zoomLevel = "automatic";
    vi.clearAllMocks();
    vi.useFakeTimers();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.useRealTimers();
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
  });

  it("lets EmbedPDF own initial zoom and persists later zoom changes", async () => {
    await act(async () => {
      root.render(<ReaderZoomHarness />);
    });

    await act(async () => {
      mocks.state.layoutReadyListener?.({
        documentId: "document-1",
        isInitial: true,
      });
    });

    expect(mocks.requestZoomMock).not.toHaveBeenCalled();
    expect(mocks.updateBookZoomMock).not.toHaveBeenCalled();

    mocks.state.zoomLevel = 1.5;
    await act(async () => {
      root.render(<ReaderZoomHarness />);
    });

    mocks.state.zoomLevel = 2;
    await act(async () => {
      root.render(<ReaderZoomHarness />);
    });

    await act(async () => {
      vi.advanceTimersByTime(700);
    });

    expect(mocks.updateBookZoomMock).toHaveBeenCalledWith({
      bookId: "book-1",
      device: "desktop",
      zoom: "2",
    });
  });
});
