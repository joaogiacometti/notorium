"use client";

import { Lock, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { getFlashcardsBySubject } from "@/app/actions/flashcards";
import { CreateFlashcardDialog } from "@/components/create-flashcard-dialog";
import { FlashcardsEmptyState } from "@/components/flashcards-empty-state";
import { FlashcardsLoading } from "@/components/flashcards-loading";
import { FlashcardsTable } from "@/components/flashcards-table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import type { FlashcardEntity } from "@/lib/api/contracts";
import { LIMITS } from "@/lib/limits";
import { resolveActionErrorMessage } from "@/lib/server-action-errors";

interface FlashcardsListProps {
  subjectId: string;
}

export function FlashcardsList({ subjectId }: Readonly<FlashcardsListProps>) {
  const t = useTranslations("FlashcardsList");
  const tErrors = useTranslations("ServerActions");
  const [createOpen, setCreateOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [accordionValue, setAccordionValue] = useState("");
  const [hasLoaded, setHasLoaded] = useState(false);
  const [flashcards, setFlashcards] = useState<FlashcardEntity[]>([]);

  const isAtLimit = flashcards.length >= LIMITS.maxFlashcardsPerSubject;

  function handleOpenChange(value: string) {
    setAccordionValue(value);
    if (value !== "flashcards" || hasLoaded || isPending) {
      return;
    }

    startTransition(async () => {
      try {
        const loaded = await getFlashcardsBySubject(subjectId);
        setFlashcards(loaded);
        setHasLoaded(true);
      } catch {
        toast.error(
          resolveActionErrorMessage({ errorCode: "common.generic" }, tErrors),
        );
      }
    });
  }

  function getSubtitle() {
    if (!hasLoaded) {
      return t("collapsed_hint");
    }

    if (flashcards.length === 0) {
      return t("count_empty");
    }

    return t("count_with_limit", {
      count: flashcards.length,
      max: LIMITS.maxFlashcardsPerSubject,
    });
  }

  function renderAccordionContent() {
    if (isPending && !hasLoaded) {
      return <FlashcardsLoading />;
    }

    if (flashcards.length === 0) {
      return <FlashcardsEmptyState />;
    }

    return (
      <FlashcardsTable flashcards={flashcards} setFlashcards={setFlashcards} />
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{t("title")}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {getSubtitle()}
          </p>
        </div>
        <CreateFlashcardDialog
          subjectId={subjectId}
          trigger={
            <Button
              size="sm"
              className="w-full gap-1.5 sm:w-auto"
              id="btn-create-flashcard"
              disabled={isAtLimit}
              title={isAtLimit ? t("limit_tooltip") : undefined}
            >
              <Plus className="size-4" />
              <span>{t("new_flashcard")}</span>
            </Button>
          }
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={(card) => setFlashcards((current) => [card, ...current])}
        />
      </div>

      {isAtLimit && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          <Lock className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-amber-800 dark:text-amber-200">
            {t("limit_message", { max: LIMITS.maxFlashcardsPerSubject })}
          </p>
        </div>
      )}

      <Accordion
        type="single"
        collapsible
        value={accordionValue}
        onValueChange={handleOpenChange}
      >
        <AccordionItem value="flashcards">
          <AccordionTrigger>{t("toggle")}</AccordionTrigger>
          <AccordionContent>{renderAccordionContent()}</AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
