"use client";

import {
  ChevronDown,
  Loader2,
  ShieldCheck,
  Sparkles,
  Wand2,
} from "lucide-react";
import type { JSX } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FlashcardsAiToolsMenuProps {
  refineMode: boolean;
  isLoadingRefineGroups: boolean;
  onOpenValidateDialog: () => void;
  onStartRefine: () => void;
}

/**
 * The manage toolbar "AI tools" dropdown: entry points for AI validation
 * and the refine mode (mastered/struggling candidates).
 *
 * Example: <FlashcardsAiToolsMenu refineMode={false} isLoadingRefineGroups={false} onOpenValidateDialog={openDialog} onStartRefine={startRefine} />
 */
export function FlashcardsAiToolsMenu({
  refineMode,
  isLoadingRefineGroups,
  onOpenValidateDialog,
  onStartRefine,
}: Readonly<FlashcardsAiToolsMenuProps>): JSX.Element {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-10 shrink-0 gap-2 rounded-lg border-primary/30 bg-primary/5 px-3 text-primary shadow-sm hover:bg-primary/10 hover:text-primary sm:px-4"
        >
          {isLoadingRefineGroups && !refineMode ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          <span className="hidden sm:inline">AI tools</span>
          <ChevronDown className="size-3.5 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuItem
          onClick={onOpenValidateDialog}
          className="items-start gap-3 py-2.5"
        >
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="font-medium">Validate cards</span>
            <span className="text-xs text-muted-foreground">
              Find incorrect, confusing, or duplicate cards.
            </span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onStartRefine}
          disabled={isLoadingRefineGroups}
          className="items-start gap-3 py-2.5"
        >
          <Wand2 className="mt-0.5 size-4 shrink-0 text-primary" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="font-medium">Refine cards</span>
            <span className="text-xs text-muted-foreground">
              Level up mastered cards and improve struggling ones.
            </span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
