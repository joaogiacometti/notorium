"use client";

import { Globe, Palette, Settings } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
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
import { usePathname, useRouter } from "@/i18n/routing";

type AppLocale = "en" | "pt";
type AppTheme =
  | "system"
  | "light"
  | "dark"
  | "catppuccin-mocha"
  | "catppuccin-latte";
type ThemeOption = {
  id: AppTheme;
  labelKey:
    | "system"
    | "light"
    | "dark"
    | "catppuccin_mocha"
    | "catppuccin_latte";
};

const themeOptions: ThemeOption[] = [
  { id: "system", labelKey: "system" },
  { id: "light", labelKey: "light" },
  { id: "dark", labelKey: "dark" },
  { id: "catppuccin-mocha", labelKey: "catppuccin_mocha" },
  { id: "catppuccin-latte", labelKey: "catppuccin_latte" },
];
const appThemes: AppTheme[] = themeOptions.map((option) => option.id);

function isLocale(value: string): value is AppLocale {
  return value === "en" || value === "pt";
}

function isAppTheme(value: string | undefined): value is AppTheme {
  return value !== undefined && appThemes.some((theme) => theme === value);
}

export function PreferencesDialog() {
  const t = useTranslations("Navigation");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const currentLocale = isLocale(locale) ? locale : "en";
  const currentTheme = isAppTheme(theme) ? theme : "system";

  const handleLocaleChange = (nextLocale: AppLocale) => {
    if (nextLocale === currentLocale) {
      return;
    }

    router.replace(pathname, { locale: nextLocale });
  };

  const handleThemeChange = (nextTheme: AppTheme) => {
    if (nextTheme === currentTheme) {
      return;
    }

    setTheme(nextTheme);
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
          {t("preferences")}
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto p-0 sm:max-w-lg">
        <DialogHeader className="border-b bg-muted/40 px-4 py-4 sm:px-6 sm:py-5">
          <DialogTitle>{t("preferences_title")}</DialogTitle>
          <DialogDescription>{t("preferences_description")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 px-4 py-4 sm:gap-4 sm:px-6 sm:py-5">
          <section className="rounded-lg border bg-card p-3.5 sm:p-4">
            <div className="mb-3 flex items-start gap-3">
              <div className="rounded-md bg-primary/10 p-2 text-primary">
                <Globe className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">{t("language")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("preferences_language_description")}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant={currentLocale === "en" ? "default" : "outline"}
                className="h-10 justify-start"
                onClick={() => handleLocaleChange("en")}
              >
                {t("english")}
              </Button>
              <Button
                type="button"
                variant={currentLocale === "pt" ? "default" : "outline"}
                className="h-10 justify-start"
                onClick={() => handleLocaleChange("pt")}
              >
                {t("portuguese")}
              </Button>
            </div>
          </section>
          <section className="rounded-lg border bg-card p-3.5 sm:p-4">
            <div className="mb-3 flex items-start gap-3">
              <div className="rounded-md bg-primary/10 p-2 text-primary">
                <Palette className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">{t("theme")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("preferences_theme_description")}
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
                  return (
                    <SelectItem key={option.id} value={option.id}>
                      {t(option.labelKey)}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </section>
          <p className="text-xs text-muted-foreground">
            {t("preferences_hint")}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
