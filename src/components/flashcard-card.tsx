"use client";

import { CreditCard, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { DeleteFlashcardDialog } from "@/components/delete-flashcard-dialog";
import { EditFlashcardDialog } from "@/components/edit-flashcard-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FlashcardEntity } from "@/lib/api/contracts";

interface FlashcardCardProps {
  flashcard: FlashcardEntity;
  onUpdated?: (flashcard: FlashcardEntity) => void;
  onDeleted?: (id: string) => void;
}

export function FlashcardCard({
  flashcard,
  onUpdated,
  onDeleted,
}: Readonly<FlashcardCardProps>) {
  const t = useTranslations("FlashcardCard");
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <Card className="group flex w-full items-center justify-between gap-2.5 rounded-xl border-border/70 bg-card/70 px-2.5 py-2 shadow-none transition-colors hover:border-border hover:bg-card">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <CreditCard className="size-3.5" />
          </div>
          <CardTitle className="truncate text-sm font-medium leading-none text-foreground/95">
            {flashcard.front}
          </CardTitle>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0 rounded-md text-muted-foreground/80 opacity-100 transition-all hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100 data-[state=open]:opacity-100"
              aria-label={t("open_actions")}
            >
              <MoreVertical className="size-3.5" />
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
      </Card>

      <EditFlashcardDialog
        flashcard={flashcard}
        open={editOpen}
        onOpenChange={setEditOpen}
        onUpdated={onUpdated}
      />
      <DeleteFlashcardDialog
        flashcardId={flashcard.id}
        flashcardFront={flashcard.front}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={onDeleted}
      />
    </>
  );
}
