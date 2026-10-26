"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";
import { isAppTheme, resolveThemeChromeColor } from "@/lib/theme";

const THEME_COLOR_SELECTOR = 'meta[name="theme-color"]';

/**
 * Keeps browser and PWA chrome aligned with the active app theme, and resets
 * a stored theme that no longer exists (a retired theme) to the system default.
 *
 * @example
 * <ThemeColorMeta />
 */
export function ThemeColorMeta() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    if (theme && !isAppTheme(theme)) {
      setTheme("system");
    }
  }, [theme, setTheme]);

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
