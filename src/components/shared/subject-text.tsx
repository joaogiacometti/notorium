"use client";

import { cn } from "@/lib/utils";

interface SubjectTextProps {
  value: string;
  mode: "wrap" | "truncate";
  className?: string;
  title?: string;
}

export function SubjectText({
  value,
  mode,
  className,
  title,
}: Readonly<SubjectTextProps>) {
  return (
    <span
      className={cn(
        mode === "wrap" ? "wrap-break-word hyphens-auto" : "min-w-0 truncate",
        className,
      )}
      title={title ?? (mode === "truncate" ? value : undefined)}
    >
      {value}
    </span>
  );
}
