import type { AppTheme, themeOptions } from "@/lib/theme";
import { cn } from "@/lib/utils";

/**
 * Shared theme presentation metadata and preview. Used by both the
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
};

export const themeDescriptionById: Record<AppTheme, string> = {
  system: "Match your device appearance",
  light: "Clean and bright workspace",
  dark: "Classic low-light contrast",
  halloween: "Warm seasonal orange accents",
};

const themePreviewPaletteById: Record<
  Exclude<AppTheme, "system">,
  { background: string; muted: string; card: string; primary: string }
> = {
  light: {
    background: "#fafafa",
    muted: "#e5e5e5",
    card: "#ffffff",
    primary: "#171717",
  },
  dark: {
    background: "#0a0a0a",
    muted: "#222222",
    card: "#131313",
    primary: "#e5e5e5",
  },
  halloween: {
    background: "#140c18",
    muted: "#261e2d",
    card: "#1f1625",
    primary: "#ff7716",
  },
};

function SceneLayer({
  themeId,
  className,
}: Readonly<{ themeId: Exclude<AppTheme, "system">; className?: string }>) {
  const palette = themePreviewPaletteById[themeId];
  return (
    <span
      className={cn("absolute inset-0 flex gap-1 p-1.5", className)}
      style={{ backgroundColor: palette.background }}
    >
      <span
        className="w-1/4 rounded-sm"
        style={{ backgroundColor: palette.muted }}
      />
      <span
        className="relative flex-1 rounded-sm border"
        style={{ backgroundColor: palette.card, borderColor: palette.muted }}
      >
        <span
          className="absolute right-1.5 bottom-1.5 h-1/5 w-1/3 rounded-[2px]"
          style={{ backgroundColor: palette.primary }}
        />
      </span>
    </span>
  );
}

/**
 * Larger theme thumbnail drawn as a miniature app (sidebar, card, primary
 * button). System splits light and dark diagonally. Size it through
 * `className`.
 */
export function ThemeScenePreview({
  themeId,
  className,
}: Readonly<{ themeId: AppTheme; className?: string }>) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative block overflow-hidden rounded-md border",
        className,
      )}
    >
      {themeId === "system" ? (
        <>
          <SceneLayer
            themeId="light"
            className="[clip-path:polygon(0_0,100%_0,0_100%)]"
          />
          <SceneLayer
            themeId="dark"
            className="[clip-path:polygon(100%_0,100%_100%,0_100%)]"
          />
        </>
      ) : (
        <SceneLayer themeId={themeId} />
      )}
    </span>
  );
}
