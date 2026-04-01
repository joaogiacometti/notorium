"use client";

import { Palette, Settings } from "lucide-react";
import { useTheme } from "next-themes";
import { updateUserTheme } from "@/app/actions/theme";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type AppTheme, isAppTheme, themeOptions } from "@/lib/theme";

export function PreferencesDialog() {
  const { theme, setTheme } = useTheme();

  const currentTheme = isAppTheme(theme) ? theme : "system";

  const handleThemeChange = async (nextTheme: AppTheme) => {
    if (nextTheme === currentTheme) {
      return;
    }

    setTheme(nextTheme);
    try {
      await updateUserTheme({ theme: nextTheme });
    } catch (error) {
      console.error("Failed to update theme preference:", error);
      setTheme(currentTheme);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <DropdownMenuItem
          onSelect={(event) => event.preventDefault()}
          className="cursor-pointer"
          data-testid="account-menu-preferences"
        >
          <Settings className="size-4" />
          Preferences
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto p-0 sm:max-w-lg">
        <DialogHeader className="border-b bg-muted/40 px-4 py-4 sm:px-6 sm:py-5">
          <DialogTitle>Preferences</DialogTitle>
          <DialogDescription>Update your theme settings.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 px-4 py-4 sm:gap-4 sm:px-6 sm:py-5">
          <section className="rounded-lg border bg-card p-3.5 sm:p-4">
            <div className="mb-3 flex items-start gap-3">
              <div className="rounded-md bg-primary/10 p-2 text-primary">
                <Palette className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">Theme</p>
                <p className="text-sm text-muted-foreground">
                  Control how the interface looks.
                </p>
              </div>
            </div>
            <Select
              value={currentTheme}
              onValueChange={(value) => {
                if (!isAppTheme(value)) {
                  return;
                }

                handleThemeChange(value);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                align="start"
                className="z-[60] w-[var(--radix-select-trigger-width)]"
              >
                {themeOptions.map((option) => {
                  const label =
                    option.labelKey === "system"
                      ? "System"
                      : option.labelKey === "light"
                        ? "Light"
                        : option.labelKey === "dark"
                          ? "Dark"
                          : option.labelKey === "tokyo_night"
                            ? "Tokyo Night"
                            : option.labelKey === "halloween"
                              ? "Halloween"
                              : option.labelKey === "catppuccin_mocha"
                                ? "Catppuccin mocha"
                                : option.labelKey === "catppuccin_latte"
                                  ? "Catppuccin latte"
                                  : option.labelKey;
                  return (
                    <SelectItem key={option.id} value={option.id}>
                      {label}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </section>
          <p className="text-xs text-muted-foreground">
            Changes are applied immediately.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
