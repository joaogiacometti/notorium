"use client";

import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { DeleteFlashcardDialog } from "@/components/delete-flashcard-dialog";
import { EditFlashcardDialog } from "@/components/edit-flashcard-dialog";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FlashcardEntity } from "@/lib/api/contracts";

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

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
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
