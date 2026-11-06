"use client";

import { FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FolderTreeEmptyStateProps {
  onCreateFolder: () => void;
}

/**
 * Renders the folder tree's empty state and first-folder action.
 *
 * @example
 * <FolderTreeEmptyState onCreateFolder={openCreateFolder} />
 */
export function FolderTreeEmptyState({
  onCreateFolder,
}: Readonly<FolderTreeEmptyStateProps>) {
  return (
    <div className="mt-2 rounded-lg border border-dashed border-border bg-muted/20 p-4 text-center">
      <p className="text-sm text-muted-foreground">No folders yet.</p>
      <Button
        type="button"
        size="sm"
        className="mt-3 gap-1.5"
        onClick={onCreateFolder}
      >
        <FolderPlus className="size-4" />
        Create your first folder
      </Button>
    </div>
  );
}
