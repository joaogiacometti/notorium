"use client";

import { cn } from "@/lib/utils";

interface MindmapToolbarButtonProps {
  label: string;
  active?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

/**
 * Icon button used inside the floating `NodeToolbar` of mindmap nodes (bold,
 * color, image, delete). Shared so branch and image nodes stay visually
 * identical without duplicating the styling.
 *
 * @example
 * <MindmapToolbarButton label="Delete" destructive onClick={onDelete}>
 *   <Trash2 className="size-4" />
 * </MindmapToolbarButton>
 */
export function MindmapToolbarButton({
  label,
  active,
  destructive,
  disabled,
  onClick,
  children,
}: Readonly<MindmapToolbarButtonProps>) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        "flex size-7 items-center justify-center rounded-md transition-colors",
        active
          ? "bg-primary/10 text-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        destructive && "hover:bg-destructive/10 hover:text-destructive",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      {children}
    </button>
  );
}
