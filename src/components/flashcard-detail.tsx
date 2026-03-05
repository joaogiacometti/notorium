"use client";

import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, CreditCard, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { DeleteFlashcardDialog } from "@/components/delete-flashcard-dialog";
import { EditFlashcardDialog } from "@/components/edit-flashcard-dialog";
import { ResetFlashcardDialog } from "@/components/reset-flashcard-dialog";
import { TiptapRenderer } from "@/components/tiptap-renderer";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/routing";
import type { FlashcardEntity } from "@/lib/api/contracts";
import { getDateFnsLocale } from "@/lib/date-locale";
import { getRichTextExcerpt } from "@/lib/rich-text";

interface FlashcardDetailProps {
  flashcard: FlashcardEntity;
}

export function FlashcardDetail({ flashcard }: Readonly<FlashcardDetailProps>) {
  const t = useTranslations("FlashcardDetail");
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  const router = useRouter();

  const [currentFlashcard, setCurrentFlashcard] =
    useState<FlashcardEntity>(flashcard);
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-foreground"
          asChild
        >
          <Link href={`/subjects/${currentFlashcard.subjectId}`}>
            <ArrowLeft className="size-4" />
            {t("back")}
          </Link>
        </Button>
      </div>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CreditCard className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="wrap-break-word text-2xl font-bold tracking-tight">
              {getRichTextExcerpt(currentFlashcard.front, 120)}
            </h1>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground/60">
              <span>
                {t("created_label")}{" "}
                {formatDistanceToNow(new Date(currentFlashcard.createdAt), {
                  addSuffix: true,
                  locale: dateLocale,
                })}
              </span>
            </div>
          </div>
        </div>
        <div className="flex w-full shrink-0 gap-2 sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 sm:flex-none"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="size-3.5" />
            {t("edit")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 sm:flex-none"
            onClick={() => setResetOpen(true)}
          >
            <RotateCcw className="size-3.5" />
            {t("reset")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 text-destructive hover:bg-destructive hover:text-destructive-foreground sm:flex-none"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-3.5" />
            {t("delete")}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="min-w-0 overflow-hidden rounded-xl border border-border/60 bg-card p-4 sm:p-6">
          <h2 className="mb-2 text-sm font-semibold text-foreground/80">
            {t("front_label")}
          </h2>
          <TiptapRenderer
            content={currentFlashcard.front}
            className="min-w-0 break-all text-sm sm:text-base"
          />
        </div>

        <div className="min-w-0 overflow-hidden rounded-xl border border-border/60 bg-card p-4 sm:p-6">
          <h2 className="mb-2 text-sm font-semibold text-foreground/80">
            {t("back_label")}
          </h2>
          <TiptapRenderer
            content={currentFlashcard.back}
            className="min-w-0 break-all text-sm sm:text-base"
          />
        </div>
      </div>

      <EditFlashcardDialog
        flashcard={currentFlashcard}
        open={editOpen}
        onOpenChange={setEditOpen}
        onUpdated={(updated) => setCurrentFlashcard(updated)}
      />
      <ResetFlashcardDialog
        flashcardId={currentFlashcard.id}
        flashcardFront={currentFlashcard.front}
        open={resetOpen}
        onOpenChange={setResetOpen}
        onReset={(updated) => setCurrentFlashcard(updated)}
      />
      <DeleteFlashcardDialog
        flashcardId={currentFlashcard.id}
        flashcardFront={currentFlashcard.front}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => {
          setDeleteOpen(false);
          router.push(`/subjects/${currentFlashcard.subjectId}`);
        }}
      />
    </div>
  );
}
