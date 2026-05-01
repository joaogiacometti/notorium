"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";
import { resolveThemeChromeColor } from "@/lib/theme";

const THEME_COLOR_SELECTOR = 'meta[name="theme-color"]';

/**
 * Keeps browser and PWA chrome aligned with the active app theme.
 *
 * @example
 * <ThemeColorMeta />
 */
export function ThemeColorMeta() {
  const { theme, resolvedTheme } = useTheme();

  useEffect(() => {
    const chromeColor = resolveThemeChromeColor(theme, resolvedTheme);
    const existingMeta =
      document.querySelector<HTMLMetaElement>(THEME_COLOR_SELECTOR);
    const themeColorMeta = existingMeta ?? document.createElement("meta");

    themeColorMeta.name = "theme-color";
    themeColorMeta.content = chromeColor;

    if (!existingMeta) {
      document.head.appendChild(themeColorMeta);
    }
  }, [theme, resolvedTheme]);

  return null;
}
