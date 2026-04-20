export const validThemes = [
  "system",
  "light",
  "dark",
  "halloween",
  "catppuccin-mocha",
] as const;

export const themeStorageKey = "theme";

export type AppTheme = (typeof validThemes)[number];

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

export const appThemes: Set<AppTheme> = new Set(validThemes);

export function isAppTheme(value: string | undefined): value is AppTheme {
  return value !== undefined && appThemes.has(value as AppTheme);
}

export function clearStoredTheme() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(themeStorageKey);
  } catch {}
}
