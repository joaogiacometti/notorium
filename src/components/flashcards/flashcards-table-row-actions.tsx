"use client";

import { MoreVertical, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FlashcardsTableRowActionsProps {
  onEditRequested: () => void;
  onResetRequested: () => void;
  onDeleteRequested: () => void;
}

export function FlashcardsTableRowActions({
  onEditRequested,
  onResetRequested,
  onDeleteRequested,
}: Readonly<FlashcardsTableRowActionsProps>) {
  const t = useTranslations("FlashcardsList");

  return (
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
        <DropdownMenuItem onClick={onEditRequested} className="cursor-pointer">
          <Pencil className="size-4" />
          {t("edit")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onResetRequested} className="cursor-pointer">
          <RotateCcw className="size-4" />
          {t("reset")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onDeleteRequested}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <Trash2 className="size-4" />
          {t("delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
