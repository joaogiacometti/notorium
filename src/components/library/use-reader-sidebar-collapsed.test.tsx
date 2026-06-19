import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useReaderSidebarCollapsed } from "@/components/library/use-reader-sidebar-collapsed";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

const STORAGE_KEY = "notorium:reader-sidebar-collapsed";

function SidebarCollapsedHarness() {
  const { collapsed, toggle } = useReaderSidebarCollapsed();

  return (
    <button type="button" data-collapsed={String(collapsed)} onClick={toggle}>
      toggle
    </button>
  );
}

function createMockStorage() {
  const store = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => store.set(key, value)),
    removeItem: vi.fn((key: string) => store.delete(key)),
    clear: vi.fn(() => store.clear()),
  };
}

describe("useReaderSidebarCollapsed", () => {
  let container: HTMLDivElement;
  let root: Root;
  const mockStorage = createMockStorage();

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    Object.defineProperty(globalThis, "localStorage", {
      value: mockStorage,
      configurable: true,
    });
    mockStorage.clear();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    mockStorage.clear();
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
  });

  function getToggleButton() {
    const button = container.querySelector("button");
    if (!button) {
      throw new Error(
        "Expected sidebar collapsed harness button to be rendered.",
      );
    }
    return button;
  }

  it("starts expanded and toggles collapsed", async () => {
    await act(async () => {
      root.render(<SidebarCollapsedHarness />);
    });

    expect(getToggleButton().dataset.collapsed).toBe("false");

    await act(async () => {
      getToggleButton().click();
    });

    expect(getToggleButton().dataset.collapsed).toBe("true");
    expect(mockStorage.getItem).toHaveBeenCalledWith(STORAGE_KEY);
    expect(mockStorage.setItem).toHaveBeenCalledWith(STORAGE_KEY, "true");
  });

  it("restores the persisted collapsed preference", async () => {
    mockStorage.setItem(STORAGE_KEY, "true");

    await act(async () => {
      root.render(<SidebarCollapsedHarness />);
    });

    expect(getToggleButton().dataset.collapsed).toBe("true");
  });

  it("toggles back to expanded", async () => {
    mockStorage.setItem(STORAGE_KEY, "true");

    await act(async () => {
      root.render(<SidebarCollapsedHarness />);
    });

    await act(async () => {
      getToggleButton().click();
    });

    expect(getToggleButton().dataset.collapsed).toBe("false");
    expect(mockStorage.setItem).toHaveBeenCalledWith(STORAGE_KEY, "false");
  });
});
