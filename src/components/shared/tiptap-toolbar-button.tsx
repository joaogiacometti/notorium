"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}

export function ToolbarButton({
  onClick,
  isActive,
  disabled,
  title,
  children,
}: Readonly<ToolbarButtonProps>) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        "size-8 shrink-0 text-muted-foreground hover:text-foreground",
        isActive && "bg-accent text-accent-foreground",
      )}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </Button>
  );
}
