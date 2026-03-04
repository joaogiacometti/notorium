"use client";

import { CreditCard, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { CreateFlashcardDialog } from "@/components/create-flashcard-dialog";
import { FlashcardCard } from "@/components/flashcard-card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import type { FlashcardEntity } from "@/lib/api/contracts";

interface FlashcardsListProps {
  subjectId: string;
  flashcards: FlashcardEntity[];
}

export function FlashcardsList({
  subjectId,
  flashcards,
}: Readonly<FlashcardsListProps>) {
  const t = useTranslations("FlashcardsList");
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div>
      <div className="mb-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{t("title")}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {flashcards.length === 0
              ? t("count_empty")
              : t("count", { count: flashcards.length })}
          </p>
        </div>
        <CreateFlashcardDialog
          subjectId={subjectId}
          trigger={
            <Button
              size="sm"
              className="w-full gap-1.5 sm:w-auto"
              id="btn-create-flashcard"
            >
              <Plus className="size-4" />
              <span>{t("new_flashcard")}</span>
            </Button>
          }
          open={createOpen}
          onOpenChange={setCreateOpen}
        />
        <Button variant="outline" size="sm" asChild>
          <Link href={`/flashcards/review?subjectId=${subjectId}`}>
            {t("review_due")}
          </Link>
        </Button>
      </div>

      {flashcards.length === 0 ? (
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
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {flashcards.map((item) => (
            <FlashcardCard key={item.id} flashcard={item} />
          ))}
        </div>
      )}
    </div>
  );
}
