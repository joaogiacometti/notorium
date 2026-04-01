"use client";

import { MoreVertical, Pencil, RotateCcw, Trash2 } from "lucide-react";

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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-9 rounded-full border border-transparent bg-background/70 text-muted-foreground/75 shadow-xs transition-all hover:border-border/70 hover:bg-background hover:text-foreground"
          aria-label="Open flashcard actions"
        >
          <MoreVertical className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEditRequested} className="cursor-pointer">
          <Pencil className="size-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onResetRequested} className="cursor-pointer">
          <RotateCcw className="size-4" />
          Reset
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onDeleteRequested}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <Trash2 className="size-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
