"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { updateUserTheme } from "@/app/actions/theme";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

export function ModeToggle({
  variant = "navbar",
  persistPreference = true,
}: Readonly<ModeToggleProps>) {
  const { theme, setTheme } = useTheme();
  const currentTheme = isAppTheme(theme) ? theme : "system";

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
            "text-muted-foreground hover:text-foreground",
            variant === "floating" &&
              "fixed top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] z-[55] border-border/60 bg-background/90 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/70",
          )}
        >
          <Sun className="size-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute size-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">Change theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {themeOptions.map((option) => (
          <DropdownMenuItem
            key={option.id}
            onClick={() => handleThemeChange(option.id)}
            className="cursor-pointer"
          >
            {themeLabelByKey[option.labelKey]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
