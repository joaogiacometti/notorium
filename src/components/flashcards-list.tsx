"use client";

import { Plus } from "lucide-react";
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

    return flashcards.length === 0
      ? t("count_empty")
      : t("count", { count: flashcards.length });
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
