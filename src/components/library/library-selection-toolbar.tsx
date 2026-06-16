"use client";

import { Search, Trash2, X } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface LibraryToolbarIconActionProps {
  ariaLabel: string;
  className: string;
  icon: ReactNode;
  onClick: () => void;
}

interface LibrarySelectionToolbarProps {
  total: number;
  selectedCount: number;
  onDelete: () => void;
  onClearSelection: () => void;
}

function LibraryToolbarIconAction({
  ariaLabel,
  className,
  icon,
  onClick,
}: Readonly<LibraryToolbarIconActionProps>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClick}
          className={className}
          aria-label={ariaLabel}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{ariaLabel}</TooltipContent>
    </Tooltip>
  );
}

export function LibrarySelectionToolbar({
  total,
  selectedCount,
  onDelete,
  onClearSelection,
}: Readonly<LibrarySelectionToolbarProps>) {
  const hasSelection = selectedCount > 0;

  return (
    <div className="flex min-h-8 flex-wrap items-center gap-2 sm:justify-between">
      <Badge
        variant="outline"
        className={cn(
          "rounded-full border-border/70 bg-background/70 px-2.5 py-0.5 text-[11px]",
          hasSelection ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {hasSelection ? null : <Search className="size-3.5" />}
        {hasSelection
          ? selectedCount === 1
            ? "1 selected"
            : `${selectedCount} selected`
          : `${total} books`}
      </Badge>
      <div
        className={cn(
          "ml-auto flex min-h-8 items-center justify-end gap-2 sm:min-w-34",
          hasSelection
            ? "visible opacity-100"
            : "pointer-events-none invisible opacity-0",
        )}
      >
        <LibraryToolbarIconAction
          ariaLabel="Delete"
          onClick={onDelete}
          className="rounded-md text-destructive hover:bg-destructive/10 hover:text-destructive"
          icon={<Trash2 className="size-4" />}
        />
        <div className="hidden h-5 w-px bg-border/60 sm:block" />
        <LibraryToolbarIconAction
          ariaLabel="Clear selection"
          onClick={onClearSelection}
          className="rounded-md text-muted-foreground hover:text-foreground"
          icon={<X className="size-4" />}
        />
      </div>
    </div>
  );
}
