import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TableHeaderLabelProps {
  children: ReactNode;
  className?: string;
  align?: "left" | "center" | "right";
}

export function TableHeaderLabel({
  children,
  className,
  align = "left",
}: Readonly<TableHeaderLabelProps>) {
  return (
    <div
      className={cn(
        "px-1 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase",
        align === "center" ? "text-center" : null,
        align === "right" ? "text-right" : null,
        className,
      )}
    >
      {children}
    </div>
  );
}
