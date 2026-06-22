import type { AppTheme, themeOptions } from "@/lib/theme";
import { cn } from "@/lib/utils";

/**
 * Shared theme presentation metadata and preview swatch. Used by both the
 * navbar/floating `ModeToggle` dropdown and the account settings appearance
 * card so labels, descriptions, icons, and previews stay in one place.
 */

export const themeLabelByKey: Record<
  (typeof themeOptions)[number]["labelKey"],
  string
> = {
  system: "System",
  light: "Light",
  dark: "Dark",
  halloween: "Halloween",
  catppuccin_mocha: "Catppuccin mocha",
};

export const themeDescriptionById: Record<AppTheme, string> = {
  system: "Match your device appearance",
  light: "Clean and bright workspace",
  dark: "Classic low-light contrast",
  halloween: "Warm seasonal orange accents",
  "catppuccin-mocha": "Soft and cozy dark palette",
};

const themePreviewPaletteById: Record<
  Exclude<AppTheme, "system">,
  { background: string; muted: string; card: string; primary: string }
> = {
  light: {
    background: "#f8fafc",
    muted: "#e2e8f0",
    card: "#ffffff",
    primary: "#0f172a",
  },
  dark: {
    background: "#0f172a",
    muted: "#1e293b",
    card: "#1e293b",
    primary: "#93c5fd",
  },
  halloween: {
    background: "#1a0f2e",
    muted: "#241235",
    card: "#241235",
    primary: "#f97316",
  },
  "catppuccin-mocha": {
    background: "#1e1e2e",
    muted: "#313244",
    card: "#313244",
    primary: "#cba6f7",
  },
};

export function ThemePreview({
  themeId,
  isSelected,
}: Readonly<{ themeId: AppTheme; isSelected: boolean }>) {
  return (
    <span
      className={cn(
        "inline-flex h-7 w-10 items-center justify-center rounded-md border border-border/70 p-0.5",
        isSelected && "border-foreground/35",
      )}
    >
      {themeId === "system" ? (
        <span className="flex h-full w-full overflow-hidden rounded-sm">
          <span className="h-full w-1/2 bg-background" />
          <span className="h-full w-1/2 bg-foreground/80" />
        </span>
      ) : (
        <span
          className="flex h-full w-full flex-col overflow-hidden rounded-sm"
          style={{
            backgroundColor: themePreviewPaletteById[themeId].background,
          }}
        >
          <span
            className="h-2/5"
            style={{ backgroundColor: themePreviewPaletteById[themeId].muted }}
          />
          <span
            className="h-3/5 px-0.5 py-0.5"
            style={{ backgroundColor: themePreviewPaletteById[themeId].card }}
          >
            <span
              className="block h-full w-full rounded-[2px]"
              style={{
                backgroundColor: themePreviewPaletteById[themeId].primary,
              }}
            />
          </span>
        </span>
      )}
    </span>
  );
}
