"use client";

import { Check, Ghost, LaptopMinimal, Moon, MoonStar, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { type ComponentType, useEffect, useState } from "react";
import { updateUserTheme } from "@/app/actions/theme";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type AppTheme, isAppTheme, themeOptions } from "@/lib/theme";
import { cn } from "@/lib/utils";

interface ModeToggleProps {
  variant?: "navbar" | "floating";
  persistPreference?: boolean;
}

const themeLabelByKey: Record<
  (typeof themeOptions)[number]["labelKey"],
  string
> = {
  system: "System",
  light: "Light",
  dark: "Dark",
  tokyo_night: "Tokyo Night",
  halloween: "Halloween",
  catppuccin_mocha: "Catppuccin mocha",
  catppuccin_latte: "Catppuccin latte",
};

const themeDescriptionById: Record<AppTheme, string> = {
  system: "Match your device appearance",
  light: "Clean and bright workspace",
  dark: "Classic low-light contrast",
  "tokyo-night": "Cool neon-inspired midnight",
  halloween: "Warm seasonal orange accents",
  "catppuccin-mocha": "Soft and cozy dark palette",
  "catppuccin-latte": "Calm pastel daylight tones",
};

function CatppuccinMochaIcon({ className }: Readonly<{ className?: string }>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 9.5h11a0 0 0 0 1 0 0V14a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V9.5a0 0 0 0 1 0 0Z" />
      <path d="M16 10.5h1.7a2.3 2.3 0 0 1 0 4.6H16" />
      <path d="M7 6.5v2" />
      <path d="M10 5.5v3" />
      <path d="M13 6.5v2" />
      <path d="M4.5 18.5h12.5" />
    </svg>
  );
}

const themeIconById: Record<AppTheme, ComponentType<{ className?: string }>> = {
  system: LaptopMinimal,
  light: Sun,
  dark: Moon,
  "tokyo-night": MoonStar,
  halloween: Ghost,
  "catppuccin-mocha": CatppuccinMochaIcon,
  "catppuccin-latte": CatppuccinMochaIcon,
};

const themePreviewPaletteById: Record<
  Exclude<AppTheme, "system">,
  { background: string; card: string; accent: string }
> = {
  light: { background: "#f8fafc", card: "#ffffff", accent: "#0f172a" },
  dark: { background: "#0f172a", card: "#1e293b", accent: "#93c5fd" },
  "tokyo-night": { background: "#1a1b26", card: "#24283b", accent: "#7aa2f7" },
  halloween: { background: "#1a0f2e", card: "#241235", accent: "#f97316" },
  "catppuccin-mocha": {
    background: "#1e1e2e",
    card: "#313244",
    accent: "#cba6f7",
  },
  "catppuccin-latte": {
    background: "#eff1f5",
    card: "#ffffff",
    accent: "#8839ef",
  },
};

function ThemePreview({
  themeId,
  isSelected,
}: Readonly<{ themeId: AppTheme; isSelected: boolean }>) {
  if (themeId === "system") {
    return (
      <span
        className={cn(
          "inline-flex h-7 w-10 overflow-hidden rounded-md border border-border/70",
          isSelected && "border-foreground/35",
        )}
      >
        <span className="h-full w-1/2 bg-background" />
        <span className="h-full w-1/2 bg-foreground/80" />
      </span>
    );
  }

  const palette = themePreviewPaletteById[themeId];

  return (
    <span
      className={cn(
        "inline-flex h-7 w-10 rounded-md border border-border/70 p-0.5",
        isSelected && "border-foreground/35",
      )}
    >
      <span
        className="flex w-full flex-col overflow-hidden rounded-sm"
        style={{ backgroundColor: palette.background }}
      >
        <span className="h-2/5" />
        <span
          className="h-3/5 px-1 py-0.5"
          style={{ backgroundColor: palette.card }}
        >
          <span
            className="block h-full w-full rounded-[2px] opacity-85"
            style={{ backgroundColor: palette.accent }}
          />
        </span>
      </span>
    </span>
  );
}

export function ModeToggle({
  variant = "navbar",
  persistPreference = true,
}: Readonly<ModeToggleProps>) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = mounted && isAppTheme(theme) ? theme : "system";
  const TriggerIcon = themeIconById[currentTheme];
  const resolvedThemeLabel =
    mounted && resolvedTheme === "dark" ? "dark" : "light";

  const dataTestId =
    variant === "floating"
      ? "theme-switcher-floating-trigger"
      : "theme-switcher-navbar-trigger";

  const handleThemeChange = async (nextTheme: AppTheme) => {
    if (nextTheme === currentTheme) {
      return;
    }

    setTheme(nextTheme);

    if (!persistPreference) {
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
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant === "floating" ? "outline" : "ghost"}
          size="icon"
          data-testid={dataTestId}
          className={cn(
            "border-border/60 text-muted-foreground hover:text-foreground",
            variant === "navbar" &&
              "size-9 rounded-full border bg-background/45 hover:bg-accent/70",
            variant === "floating" &&
              "fixed top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] z-55 rounded-full border bg-background/90 shadow-sm backdrop-blur supports-backdrop-filter:bg-background/70",
          )}
        >
          <TriggerIcon className="size-4 shrink-0" />
          <span className="sr-only">Change theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-72 rounded-xl border-border/70 p-2"
      >
        <DropdownMenuLabel className="px-2 pb-1.5">
          <div className="grid gap-0.5">
            <span className="text-sm font-semibold">Appearance</span>
            <span className="text-xs text-muted-foreground">
              System currently resolves to {resolvedThemeLabel}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {themeOptions.map((option) => {
          const OptionIcon = themeIconById[option.id];
          const isSelected = option.id === currentTheme;

          return (
            <DropdownMenuItem
              key={option.id}
              onClick={() => handleThemeChange(option.id)}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg border border-transparent px-2 py-2.5 transition-colors",
                isSelected
                  ? "border-border/80 bg-accent/65 text-foreground"
                  : "hover:border-border/50 hover:bg-accent/45",
              )}
            >
              <ThemePreview themeId={option.id} isSelected={isSelected} />
              <span
                className={cn(
                  "inline-flex size-7 items-center justify-center rounded-full border border-border/60 bg-background/80",
                  isSelected &&
                    "border-foreground/20 bg-accent text-foreground",
                )}
              >
                <OptionIcon className="size-3.5 shrink-0" />
              </span>
              <div className="grid flex-1 gap-0.5">
                <span className="text-sm leading-none font-medium">
                  {themeLabelByKey[option.labelKey]}
                </span>
                <span className="text-xs text-muted-foreground">
                  {themeDescriptionById[option.id]}
                </span>
              </div>
              {isSelected && (
                <Check className="text-foreground size-4 shrink-0" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
