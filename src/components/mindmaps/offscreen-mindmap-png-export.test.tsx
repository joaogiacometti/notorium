import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OffscreenMindmapPngExport } from "@/components/mindmaps/offscreen-mindmap-png-export";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

const { fetchMindmapByIdMock, toastErrorMock } = vi.hoisted(() => ({
  fetchMindmapByIdMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock("@/lib/read-api/documents", () => ({
  fetchMindmapById: fetchMindmapByIdMock,
}));

vi.mock("sonner", () => ({
  toast: { error: toastErrorMock },
}));

vi.mock("@/components/mindmaps/lazy-mindmap-canvas", () => ({
  LazyMindmapCanvas: () => null,
}));

describe("OffscreenMindmapPngExport", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.clearAllMocks();
  });

  async function renderExport(onDone: () => void) {
    await act(async () => {
      root.render(
        <OffscreenMindmapPngExport mindmapId="mindmap-1" onDone={onDone} />,
      );
    });
  }

  it("ends the export with an error toast when loading fails", async () => {
    fetchMindmapByIdMock.mockRejectedValueOnce(new Error("network down"));
    const onDone = vi.fn();

    await renderExport(onDone);

    expect(toastErrorMock).toHaveBeenCalledWith(
      "Couldn't load the mindmap to export",
    );
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("ends the export when the mindmap no longer exists", async () => {
    fetchMindmapByIdMock.mockResolvedValueOnce(null);
    const onDone = vi.fn();

    await renderExport(onDone);

    expect(toastErrorMock).toHaveBeenCalledWith(
      "Couldn't load the mindmap to export",
    );
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
