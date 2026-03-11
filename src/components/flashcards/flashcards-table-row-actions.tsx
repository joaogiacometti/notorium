"use client";

import { MoreVertical, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { DeleteFlashcardDialog } from "@/components/flashcards/delete-flashcard-dialog";
import { EditFlashcardDialog } from "@/components/flashcards/edit-flashcard-dialog";
import { ResetFlashcardDialog } from "@/components/flashcards/reset-flashcard-dialog";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FlashcardEntity } from "@/lib/server/api-contracts";

interface FlashcardsTableRowActionsProps {
  flashcard: FlashcardEntity;
  onUpdated: (flashcard: FlashcardEntity) => void;
  onDeleted: (id: string) => void;
}

export function FlashcardsTableRowActions({
  flashcard,
  onUpdated,
  onDeleted,
}: Readonly<FlashcardsTableRowActionsProps>) {
  const t = useTranslations("FlashcardsList");

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-9 rounded-full border border-transparent bg-background/70 text-muted-foreground/75 shadow-xs transition-all hover:border-border/70 hover:bg-background hover:text-foreground"
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
            onClick={() => setResetOpen(true)}
            className="cursor-pointer"
          >
            <RotateCcw className="size-4" />
            {t("reset")}
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

      <EditFlashcardDialog
        flashcard={flashcard}
        open={editOpen}
        onOpenChange={setEditOpen}
        onUpdated={onUpdated}
      />
      <ResetFlashcardDialog
        flashcardId={flashcard.id}
        flashcardFront={flashcard.front}
        open={resetOpen}
        onOpenChange={setResetOpen}
        onReset={onUpdated}
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
