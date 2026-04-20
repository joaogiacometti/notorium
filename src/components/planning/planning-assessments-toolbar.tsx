"use client";

import { Check, Clock3, Search, Trash2, X } from "lucide-react";
import type { JSX } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface PlanningAssessmentsToolbarProps {
  selectedAssessmentIds: string[];
  total: number;
  onClearSelection: () => void;
  onOpenBulkDeleteDialog: () => void;
  onOpenMarkCompletedDialog: () => void;
  onOpenMarkPendingDialog: () => void;
}

interface ToolbarIconActionButtonProps {
  ariaLabel: string;
  className: string;
  icon: JSX.Element;
  onClick: () => void;
}

function ToolbarIconActionButton({
  ariaLabel,
  className,
  icon,
  onClick,
}: Readonly<ToolbarIconActionButtonProps>) {
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

export function PlanningAssessmentsToolbar({
  selectedAssessmentIds,
  total,
  onClearSelection,
  onOpenBulkDeleteDialog,
  onOpenMarkCompletedDialog,
  onOpenMarkPendingDialog,
}: Readonly<PlanningAssessmentsToolbarProps>) {
  const selectedCount = selectedAssessmentIds.length;
  const hasSelection = selectedCount > 0;

  return (
    <TooltipProvider>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge
          variant="outline"
          className={cn(
            "rounded-full border-border/70 bg-background/70 px-2.5 py-0.5 text-[11px]",
            hasSelection ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {hasSelection ? null : <Search className="size-3.5" />}
          {hasSelection
            ? `${selectedCount} selected`
            : `${total} ${total === 1 ? "item" : "items"}`}
        </Badge>
        {hasSelection ? (
          <div className={cn("flex items-center gap-1 transition-opacity")}>
            <ToolbarIconActionButton
              ariaLabel="Mark Completed"
              onClick={onOpenMarkCompletedDialog}
              className="rounded-md text-muted-foreground hover:text-foreground"
              icon={<Check className="size-4" />}
            />
            <ToolbarIconActionButton
              ariaLabel="Mark Pending"
              onClick={onOpenMarkPendingDialog}
              className="rounded-md text-muted-foreground hover:text-foreground"
              icon={<Clock3 className="size-4" />}
            />
            <ToolbarIconActionButton
              ariaLabel="Delete"
              onClick={onOpenBulkDeleteDialog}
              className="rounded-md text-destructive hover:bg-destructive/10 hover:text-destructive"
              icon={<Trash2 className="size-4" />}
            />
            <div className="hidden h-5 w-px bg-border/60 sm:block" />
            <ToolbarIconActionButton
              ariaLabel="Clear selection"
              onClick={onClearSelection}
              className="rounded-md text-muted-foreground hover:text-foreground"
              icon={<X className="size-4" />}
            />
          </div>
        ) : null}
      </div>
    </TooltipProvider>
  );
}
