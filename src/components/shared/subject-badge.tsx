"use client";

import Link from "next/link";
import type { KeyboardEventHandler, MouseEventHandler } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SubjectBadgeProps {
  href?: string;
  label: string;
  maxWidthClassName?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  onKeyDown?: KeyboardEventHandler<HTMLAnchorElement>;
}

/**
 * Renders a subject name as a rounded badge, optionally linked.
 *
 * @example
 * <SubjectBadge href="/subjects/abc" label="Math" />
 */
export function SubjectBadge({
  href,
  label,
  maxWidthClassName = "max-w-40",
  onClick,
  onKeyDown,
}: Readonly<SubjectBadgeProps>) {
  const badgeClassName = cn(
    "h-7 rounded-full px-2.5 text-xs text-muted-foreground",
    maxWidthClassName,
  );

  if (!href) {
    return (
      <Badge variant="outline" className={badgeClassName}>
        <span className="truncate">{label}</span>
      </Badge>
    );
  }

  return (
    <Badge variant="outline" asChild className={badgeClassName}>
      <Link href={href} onClick={onClick} onKeyDown={onKeyDown}>
        <span className="truncate">{label}</span>
      </Link>
    </Badge>
  );
}
