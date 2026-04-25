"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DeckSidebarRowProps {
  children: ReactNode;
  deckId?: string;
  depth: number;
  isSelected: boolean;
  isDragging?: boolean;
  isDropTarget?: boolean;
  draggable?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  onDragEnd?: () => void;
  onDragOver?: () => void;
  onDragStart?: () => void;
  onDrop?: () => void;
  onSelect: () => void;
}

export function DeckSidebarRow({
  children,
  deckId,
  depth,
  isSelected,
  isDragging,
  isDropTarget,
  draggable,
  leading,
  trailing,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onSelect,
}: Readonly<DeckSidebarRowProps>) {
  return (
    <div
      className={cn(
        "group flex w-full items-center gap-1 rounded-xl pr-1 text-left transition-[opacity,background-color,color,box-shadow]",
        isSelected
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
        isDropTarget
          ? "bg-background ring-1 ring-[color:var(--intent-info-border)]"
          : undefined,
        isDragging ? "opacity-50" : undefined,
      )}
      style={{ paddingLeft: `${depth * 12}px` }}
    >
      {leading ?? <span className="size-7 shrink-0" aria-hidden />}
      <button
        type="button"
        className={cn(
          "flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm",
          isSelected ? "font-medium" : undefined,
        )}
        data-deck-id={deckId}
        data-deck-row="true"
        draggable={draggable}
        onDragEnd={onDragEnd}
        onDragOver={(event) => {
          event.preventDefault();
          onDragOver?.();
        }}
        onDragStart={onDragStart}
        onClick={onSelect}
        onDrop={(event) => {
          event.preventDefault();
          onDrop?.();
        }}
      >
        {children}
      </button>
      {trailing ?? <span className="size-7 shrink-0" aria-hidden />}
    </div>
  );
}
