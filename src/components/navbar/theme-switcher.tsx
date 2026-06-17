"use client";

import { Check } from "lucide-react";
import {
  ThemePreview,
  themeDescriptionById,
  themeIconById,
  themeLabelByKey,
} from "@/components/navbar/theme-options";
import { useThemeControl } from "@/components/navbar/use-theme-control";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type AppTheme, themeOptions } from "@/lib/theme";
import { cn } from "@/lib/utils";

interface ModeToggleProps {
  variant?: "navbar" | "floating";
  syncWithServer?: boolean;
}

export function ModeToggle({
  variant = "navbar",
  syncWithServer = true,
}: Readonly<ModeToggleProps>) {
  const { currentTheme, resolvedTheme, mounted, setAppTheme } =
    useThemeControl(syncWithServer);
  const TriggerIcon = themeIconById[currentTheme];
  const resolvedThemeLabel =
    mounted && resolvedTheme === "dark" ? "dark" : "light";

  const dataTestId =
    variant === "floating"
      ? "theme-switcher-floating-trigger"
      : "theme-switcher-navbar-trigger";

  const handleThemeChange = (nextTheme: AppTheme) => {
    void setAppTheme(nextTheme);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          data-testid={dataTestId}
          className={cn(
            "border-border/60 text-muted-foreground hover:text-accent-foreground",
            variant === "navbar" &&
              "size-9 justify-center px-0 text-sm leading-none",
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
