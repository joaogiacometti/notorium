"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { updateUserTheme } from "@/app/actions/theme";
import { type AppTheme, isAppTheme } from "@/lib/theme";

interface ThemeControl {
  currentTheme: AppTheme;
  resolvedTheme: string | undefined;
  mounted: boolean;
  setAppTheme: (nextTheme: AppTheme) => Promise<void>;
}

/**
 * Shared theme switching with optimistic update and rollback on a failed
 * persist. Used by both the navbar mode toggle and the command palette so the
 * rollback logic lives in one place.
 *
 * @example
 * const { currentTheme, setAppTheme } = useThemeControl();
 * await setAppTheme("dark");
 */
export function useThemeControl(syncWithServer = true): ThemeControl {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme: AppTheme =
    mounted && isAppTheme(theme) ? theme : "system";

  async function setAppTheme(nextTheme: AppTheme) {
    if (nextTheme === currentTheme) {
      return;
    }

    setTheme(nextTheme);

    if (!syncWithServer) {
      return;
    }

    try {
      const result = await updateUserTheme({ theme: nextTheme });
      if (!result.success) {
        setTheme(currentTheme);
      }
    } catch {
      setTheme(currentTheme);
    }
  }

  return { currentTheme, resolvedTheme, mounted, setAppTheme };
}
