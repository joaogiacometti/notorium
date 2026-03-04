"use client";

import { CreditCard } from "lucide-react";
import { useTranslations } from "next-intl";

export function FlashcardsEmptyState() {
  const t = useTranslations("FlashcardsList");

  return (
    <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <CreditCard className="size-4" />
        </div>
        <div>
          <h3 className="text-base font-semibold">{t("empty_title")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("empty_description")}
          </p>
        </div>
      </div>
    </div>
  );
}
