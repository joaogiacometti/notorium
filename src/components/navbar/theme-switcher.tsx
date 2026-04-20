"use client";

import { Check, Ghost, LaptopMinimal, Moon, Sun } from "lucide-react";
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
  syncWithServer?: boolean;
}

const themeLabelByKey: Record<
  (typeof themeOptions)[number]["labelKey"],
  string
> = {
  system: "System",
  light: "Light",
  dark: "Dark",
  halloween: "Halloween",
  catppuccin_mocha: "Catppuccin mocha",
};

const themeDescriptionById: Record<AppTheme, string> = {
  system: "Match your device appearance",
  light: "Clean and bright workspace",
  dark: "Classic low-light contrast",
  halloween: "Warm seasonal orange accents",
  "catppuccin-mocha": "Soft and cozy dark palette",
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
  halloween: Ghost,
  "catppuccin-mocha": CatppuccinMochaIcon,
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

function ThemePreview({
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

export function ModeToggle({
  variant = "navbar",
  syncWithServer = true,
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
