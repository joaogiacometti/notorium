"use client";

import { Check } from "lucide-react";
import {
  SettingsRow,
  SettingsSection,
} from "@/components/account/settings-section";
import {
  ThemePreview,
  themeDescriptionById,
  themeLabelByKey,
} from "@/components/navbar/theme-options";
import { useThemeControl } from "@/components/navbar/use-theme-control";
import { type AppTheme, themeOptions } from "@/lib/theme";
import { cn } from "@/lib/utils";

/**
 * Theme selection for the settings dialog. Persists the choice to the server
 * via `useThemeControl`. The check icon's space is always reserved so selecting
 * a theme never reflows the row height.
 */
export function AppearanceCard() {
  const { currentTheme, resolvedTheme, mounted, setAppTheme } =
    useThemeControl(true);
  const resolvedThemeLabel =
    mounted && resolvedTheme === "dark" ? "dark" : "light";

  const handleThemeChange = (nextTheme: AppTheme) => {
    void setAppTheme(nextTheme);
  };

  return (
    <SettingsSection title="Appearance">
      <SettingsRow
        label="Theme"
        description={`System currently resolves to ${resolvedThemeLabel}.`}
        keywords="appearance dark light mode color"
      >
        <div className="grid gap-1.5 sm:grid-cols-2">
          {themeOptions.map((option) => {
            const isSelected = mounted && option.id === currentTheme;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleThemeChange(option.id)}
                aria-pressed={isSelected}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left transition-colors",
                  isSelected
                    ? "border-border/80 bg-accent/65 text-foreground"
                    : "hover:border-border/50 hover:bg-accent/45",
                )}
              >
                <ThemePreview themeId={option.id} isSelected={isSelected} />
                <div className="grid min-w-0 flex-1 gap-0.5">
                  <span className="text-sm leading-none font-medium">
                    {themeLabelByKey[option.labelKey]}
                  </span>
                  <span className="line-clamp-1 text-xs text-muted-foreground">
                    {themeDescriptionById[option.id]}
                  </span>
                </div>
                <Check
                  aria-hidden
                  className={cn(
                    "size-4 shrink-0 text-foreground",
                    isSelected ? "opacity-100" : "opacity-0",
                  )}
                />
              </button>
            );
          })}
        </div>
      </SettingsRow>
    </SettingsSection>
  );
}
