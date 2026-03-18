export const validThemes = [
  "system",
  "light",
  "dark",
  "tokyo-night",
  "halloween",
  "catppuccin-mocha",
  "catppuccin-latte",
] as const;

export type AppTheme = (typeof validThemes)[number];

export type ThemeOption = {
  id: AppTheme;
  labelKey:
    | "system"
    | "light"
    | "dark"
    | "tokyo_night"
    | "halloween"
    | "catppuccin_mocha"
    | "catppuccin_latte";
};

export const themeOptions: ThemeOption[] = [
  { id: "system", labelKey: "system" },
  { id: "light", labelKey: "light" },
  { id: "dark", labelKey: "dark" },
  { id: "tokyo-night", labelKey: "tokyo_night" },
  { id: "halloween", labelKey: "halloween" },
  { id: "catppuccin-mocha", labelKey: "catppuccin_mocha" },
  { id: "catppuccin-latte", labelKey: "catppuccin_latte" },
];

export const appThemes: Set<AppTheme> = new Set(validThemes);

export function isAppTheme(value: string | undefined): value is AppTheme {
  return value !== undefined && appThemes.has(value as AppTheme);
}
