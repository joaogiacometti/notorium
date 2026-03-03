import type { Locale } from "date-fns";
import { enUS, ptBR } from "date-fns/locale";

export function getDateFnsLocale(locale: string): Locale {
  return locale === "pt" ? ptBR : enUS;
}

export function getIntlLocale(locale: string): string {
  return locale === "pt" ? "pt-BR" : "en-US";
}
