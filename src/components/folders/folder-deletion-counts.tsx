"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import {
  FileText,
  FileType,
  Folder,
  Layers,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { FolderDeletionSummary } from "@/lib/server/api-contracts";

const COUNT_ROWS = [
  { key: "nestedFolderCount", label: "Nested folders", icon: Folder },
  { key: "noteCount", label: "Notes", icon: FileText },
  { key: "pdfCount", label: "PDFs", icon: FileType },
  { key: "flashcardCount", label: "Flashcards", icon: Layers },
] as const satisfies ReadonlyArray<{
  key: keyof FolderDeletionSummary;
  label: string;
  icon: LucideIcon;
}>;

interface FolderDeletionCountsProps {
  summary: UseQueryResult<FolderDeletionSummary>;
}

/**
 * Lists how many items deleting a folder removes across its subtree, falling
 * back to a generic warning with retry when the counts cannot be loaded.
 *
 * @example <FolderDeletionCounts summary={useQuery(folderDeletionSummaryQuery(id))} />
 */
export function FolderDeletionCounts({
  summary,
}: Readonly<FolderDeletionCountsProps>) {
  if (summary.isError) {
    return (
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>
          Nested folders and all associated notes, flashcards, and attachments
          will also be deleted.
        </p>
        <p className="flex items-center gap-2">
          Couldn't load what will be deleted.
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto p-0"
            onClick={() => void summary.refetch()}
          >
            Retry
          </Button>
        </p>
      </div>
    );
  }

  if (!summary.data) {
    return (
      <div
        className="space-y-2"
        role="status"
        aria-label="Counting folder contents"
      >
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  const counts = summary.data;
  const rows = COUNT_ROWS.filter(({ key }) => counts[key] > 0);
  if (rows.length === 0) return null;

  return (
    <ul
      aria-label="Folder contents to delete"
      className="divide-y divide-border/60"
    >
      {rows.map(({ key, label, icon: Icon }) => (
        <li key={key} className="flex items-center gap-2 py-2 text-sm">
          <Icon className="size-4 text-muted-foreground" aria-hidden />
          <span className="flex-1">{label}</span>
          <span className="font-medium tabular-nums">
            {counts[key].toLocaleString("en-US")}
          </span>
        </li>
      ))}
    </ul>
  );
}
