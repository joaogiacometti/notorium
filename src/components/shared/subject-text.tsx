"use client";

import { cn } from "@/lib/utils";

interface SubjectTextProps {
  value: string;
  mode: "wrap" | "truncate";
  className?: string;
  title?: string;
}

const LONG_TOKEN_CHUNK_SIZE = 12;
const SOFT_HYPHEN = "\u00ad";
const LONG_TOKEN_PATTERN = /\S{13,}/g;
const LONG_TOKEN_CHUNK_PATTERN = new RegExp(
  `.{1,${LONG_TOKEN_CHUNK_SIZE}}`,
  "g",
);

export function SubjectText({
  value,
  mode,
  className,
  title,
}: Readonly<SubjectTextProps>) {
  const displayValue =
    mode === "wrap" ? addSoftHyphensToLongTokens(value) : value;

  return (
    <span
      className={cn(
        mode === "wrap"
          ? "min-w-0 max-w-full whitespace-normal wrap-break-word hyphens-manual"
          : "min-w-0 truncate",
        className,
      )}
      title={title ?? (mode === "truncate" ? value : undefined)}
    >
      {displayValue}
    </span>
  );
}

function addSoftHyphensToLongTokens(value: string): string {
  return value.replaceAll(LONG_TOKEN_PATTERN, (token) =>
    (token.match(LONG_TOKEN_CHUNK_PATTERN) ?? [token]).join(SOFT_HYPHEN),
  );
}
