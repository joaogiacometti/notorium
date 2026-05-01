export const validThemes = [
  "system",
  "light",
  "dark",
  "halloween",
  "catppuccin-mocha",
] as const;

export const themeStorageKey = "theme";

export type AppTheme = (typeof validThemes)[number];
export type ResolvedAppTheme = Exclude<AppTheme, "system">;

export type ThemeOption = {
  id: AppTheme;
  labelKey: "system" | "light" | "dark" | "halloween" | "catppuccin_mocha";
};

export const themeOptions: ThemeOption[] = [
  { id: "system", labelKey: "system" },
  { id: "light", labelKey: "light" },
  { id: "dark", labelKey: "dark" },
  { id: "halloween", labelKey: "halloween" },
  { id: "catppuccin-mocha", labelKey: "catppuccin_mocha" },
];

export const themeChromeColorById: Record<ResolvedAppTheme, string> = {
  light: "#ffffff",
  dark: "#09090b",
  halloween: "#1a1028",
  "catppuccin-mocha": "#1e1e2e",
};

export const defaultThemeChromeColor = themeChromeColorById.dark;
export const pwaLaunchBackgroundColor = defaultThemeChromeColor;

export const appThemes: Set<AppTheme> = new Set(validThemes);

export function isAppTheme(value: string | undefined): value is AppTheme {
  return value !== undefined && appThemes.has(value as AppTheme);
}

/**
 * Resolve the browser/PWA chrome color for the selected app theme.
 *
 * @example
 * resolveThemeChromeColor("system", "dark")
 */
export function resolveThemeChromeColor(
  selectedTheme: string | undefined,
  resolvedTheme: string | undefined,
): string {
  const themeId = selectedTheme === "system" ? resolvedTheme : selectedTheme;
  if (!isAppTheme(themeId) || themeId === "system") {
    return defaultThemeChromeColor;
  }

  return themeChromeColorById[themeId];
}

export function clearStoredTheme() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(themeStorageKey);
  } catch {}
}
