"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

export function FlashcardsLoading() {
  const t = useTranslations("FlashcardsList");

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      {t("loading")}
    </div>
  );
}
