"use client";

import { FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SubjectTreeEmptyStateProps {
  onCreateSubject: () => void;
}

/**
 * Renders the subject tree's empty state and first-subject action.
 *
 * @example
 * <SubjectTreeEmptyState onCreateSubject={openCreateSubject} />
 */
export function SubjectTreeEmptyState({
  onCreateSubject,
}: Readonly<SubjectTreeEmptyStateProps>) {
  return (
    <div className="mt-2 rounded-lg border border-dashed border-border/60 p-4 text-center">
      <p className="text-sm text-muted-foreground">No subjects yet.</p>
      <Button
        type="button"
        size="sm"
        className="mt-3 gap-1.5"
        onClick={onCreateSubject}
      >
        <FolderPlus className="size-4" />
        Create your first subject
      </Button>
    </div>
  );
}
