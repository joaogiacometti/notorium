"use client";

import { Check } from "lucide-react";
import { SettingsCard } from "@/components/account/settings-section";
import {
  ThemeScenePreview,
  themeDescriptionById,
  themeLabelByKey,
} from "@/components/navbar/theme-options";
import { useThemeControl } from "@/components/navbar/use-theme-control";
import { type AppTheme, themeOptions } from "@/lib/theme";
import { cn } from "@/lib/utils";

/**
 * Appearance settings: app theme selection as preview tiles. Theme is persisted
 * through `useThemeControl`. The check icon's space is always reserved so
 * selecting a theme never shifts the label.
 */
export function AppearanceCard() {
  const { currentTheme, resolvedTheme, mounted, setAppTheme } =
    useThemeControl(true);
  const resolvedThemeLabel =
    mounted && resolvedTheme === "dark" ? "dark" : "light";

  function handleThemeChange(nextTheme: AppTheme) {
    void setAppTheme(nextTheme);
  }

  return (
    <SettingsCard
      title="Theme"
      description={`Saved to your account and applied on every device. System currently resolves to ${resolvedThemeLabel}.`}
      keywords="appearance dark light mode color"
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {themeOptions.map((option) => {
          const isSelected = mounted && option.id === currentTheme;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleThemeChange(option.id)}
              aria-pressed={isSelected}
              className="group flex flex-col rounded-lg text-left outline-none"
            >
              <ThemeScenePreview
                themeId={option.id}
                className={cn(
                  "h-20 outline-2 outline-offset-2 outline-transparent transition-colors group-hover:outline-border group-focus-visible:outline-ring",
                  isSelected && "outline-primary group-hover:outline-primary",
                )}
              />
              <span className="mt-2 flex items-center gap-1.5 text-sm font-medium">
                <Check
                  aria-hidden
                  className={cn(
                    "size-3.5 shrink-0 text-primary",
                    isSelected ? "opacity-100" : "opacity-0",
                  )}
                />
                {themeLabelByKey[option.labelKey]}
              </span>
              <span className="line-clamp-2 text-xs text-muted-foreground">
                {themeDescriptionById[option.id]}
              </span>
            </button>
          );
        })}
      </div>
    </SettingsCard>
  );
}
