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
import type { validThemes } from "@/lib/theme";

export function ModeToggle() {
  const { theme, setTheme } = useTheme();

  const handleThemeChange = async (nextTheme: (typeof validThemes)[number]) => {
    const currentTheme = theme ?? "system";
    setTheme(nextTheme);
    try {
      await updateUserTheme({ theme: nextTheme });
    } catch (error) {
      console.error("Failed to update theme preference:", error);
      setTheme(currentTheme);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
        >
          <Sun className="size-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute size-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => handleThemeChange("system")}
          className="cursor-pointer"
        >
          System
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleThemeChange("light")}
          className="cursor-pointer"
        >
          Light
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleThemeChange("dark")}
          className="cursor-pointer"
        >
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleThemeChange("tokyo-night")}
          className="cursor-pointer"
        >
          Tokyo Night
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleThemeChange("halloween")}
          className="cursor-pointer"
        >
          Halloween
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleThemeChange("catppuccin-mocha")}
          className="cursor-pointer"
        >
          Catppuccin mocha
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleThemeChange("catppuccin-latte")}
          className="cursor-pointer"
        >
          Catppuccin latte
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
