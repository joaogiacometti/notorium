"use client";

import Link from "next/link";
import type { KeyboardEventHandler, MouseEventHandler } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SubjectChipProps {
  href?: string;
  label: string;
  maxWidthClassName?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  onKeyDown?: KeyboardEventHandler<HTMLAnchorElement>;
}

export function SubjectChip({
  href,
  label,
  maxWidthClassName = "max-w-[10rem]",
  onClick,
  onKeyDown,
}: Readonly<SubjectChipProps>) {
  const className = cn(
    "inline-flex min-w-0 rounded-full border border-border/70 bg-muted/35 px-2.5 py-1 text-muted-foreground",
    maxWidthClassName,
  );

  if (!href) {
    return (
      <Badge variant="outline" className={className}>
        <span className="truncate">{label}</span>
      </Badge>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        className,
        "hover:border-border hover:bg-background hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      <span className="truncate">{label}</span>
    </Link>
  );
}
