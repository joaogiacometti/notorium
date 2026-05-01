"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ThemeColorMeta } from "@/components/navbar/theme-color-meta";

/**
 * Wraps next-themes and installs Notorium's document-level theme effects.
 *
 * @example
 * <ThemeProvider attribute="class">...</ThemeProvider>
 */
export function ThemeProvider({
  children,
  ...props
}: Readonly<React.ComponentProps<typeof NextThemesProvider>>) {
  return (
    <NextThemesProvider {...props}>
      <ThemeColorMeta />
      {children}
    </NextThemesProvider>
  );
}
