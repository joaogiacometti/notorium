"use client";

import { formatDistanceToNow } from "date-fns";
import { CreditCard, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { DeleteFlashcardDialog } from "@/components/delete-flashcard-dialog";
import { EditFlashcardDialog } from "@/components/edit-flashcard-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FlashcardEntity } from "@/lib/api/contracts";
import { getDateFnsLocale } from "@/lib/date-locale";

interface FlashcardCardProps {
  flashcard: FlashcardEntity;
}

export function FlashcardCard({ flashcard }: Readonly<FlashcardCardProps>) {
  const t = useTranslations("FlashcardCard");
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <Card className="group relative min-w-0 overflow-hidden transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5">
        <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
              <CreditCard className="size-4" />
            </div>
            <CardTitle className="truncate text-base leading-tight">
              {flashcard.front}
            </CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 text-muted-foreground opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 data-[state=open]:opacity-100"
                aria-label={t("open_actions")}
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setEditOpen(true)}
                className="cursor-pointer"
              >
                <Pencil className="size-4" />
                {t("edit")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <Trash2 className="size-4" />
                {t("delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <p className="line-clamp-4 whitespace-pre-wrap text-sm text-muted-foreground">
            {flashcard.back}
          </p>
          <p className="text-xs text-muted-foreground/60">
            {t("created_label")}{" "}
            {formatDistanceToNow(new Date(flashcard.createdAt), {
              addSuffix: true,
              locale: dateLocale,
            })}
          </p>
        </CardContent>
      </Card>

      <EditFlashcardDialog
        flashcard={flashcard}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeleteFlashcardDialog
        flashcardId={flashcard.id}
        flashcardFront={flashcard.front}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}
