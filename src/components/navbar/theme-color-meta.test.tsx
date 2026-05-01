import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeColorMeta } from "@/components/navbar/theme-color-meta";
import { themeChromeColorById } from "@/lib/theme";

const { themeState } = vi.hoisted(() => ({
  themeState: {
    theme: "light",
    resolvedTheme: "light",
  },
}));

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: themeState.theme,
    resolvedTheme: themeState.resolvedTheme,
  }),
}));

describe("ThemeColorMeta", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    document.head
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((meta) => {
        meta.remove();
      });
    themeState.theme = "light";
    themeState.resolvedTheme = "light";
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    document.head
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((meta) => {
        meta.remove();
      });
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
    vi.clearAllMocks();
  });

  it("updates the theme-color meta tag when selected themes change", async () => {
    await act(async () => {
      root.render(<ThemeColorMeta />);
    });

    for (const theme of ["dark", "halloween", "catppuccin-mocha"] as const) {
      themeState.theme = theme;
      themeState.resolvedTheme = theme;

      await act(async () => {
        root.render(<ThemeColorMeta />);
      });

      const themeColorMeta = document.head.querySelector<HTMLMetaElement>(
        'meta[name="theme-color"]',
      );
      expect(themeColorMeta?.content).toBe(themeChromeColorById[theme]);
    }
  });
});
