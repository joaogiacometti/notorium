"use client";

import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ArchiveRestore, Loader2, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { restoreSubject } from "@/app/actions/subjects";
import { DeleteSubjectDialog } from "@/components/delete-subject-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SubjectEntity } from "@/lib/api/contracts";

interface ArchivedSubjectCardProps {
  subject: SubjectEntity;
}

export function ArchivedSubjectCard({
  subject,
}: Readonly<ArchivedSubjectCardProps>) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isRestoring, startRestoreTransition] = useTransition();
  const queryClient = useQueryClient();

  const archivedLabel = subject.archivedAt
    ? formatDistanceToNow(new Date(subject.archivedAt), {
        addSuffix: true,
      })
    : null;

  function handleRestore() {
    startRestoreTransition(async () => {
      const result = await restoreSubject({ id: subject.id });

      if (result.success) {
        await queryClient.invalidateQueries({ queryKey: ["search-data"] });
        return;
      }

      toast.error(result.error);
    });
  }

  return (
    <>
      <Card className="border-border/60 bg-muted/20">
        <CardHeader className="pb-2">
          <CardTitle className="truncate text-base leading-tight">
            {subject.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {subject.description && (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {subject.description}
            </p>
          )}
          {archivedLabel && (
            <p className="text-xs text-muted-foreground/60">
              Archived {archivedLabel}
            </p>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 gap-1.5"
              onClick={handleRestore}
              disabled={isRestoring}
            >
              {isRestoring ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArchiveRestore className="size-4" />
              )}
              Restore
            </Button>
            <Button
              variant="destructive"
              className="flex-1 gap-1.5"
              onClick={() => setDeleteOpen(true)}
              disabled={isRestoring}
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      <DeleteSubjectDialog
        subjectId={subject.id}
        subjectName={subject.name}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        mode="delete"
      />
    </>
  );
}
