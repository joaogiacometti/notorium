"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ArchiveRestore, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { restoreSubject } from "@/app/actions/subjects";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { SubjectText } from "@/components/shared/subject-text";
import { DeleteSubjectDialog } from "@/components/subjects/delete-subject-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/dates/format";
import type { SubjectEntity } from "@/lib/server/api-contracts";
import { t } from "@/lib/server/server-action-errors";

interface ArchivedSubjectCardProps {
  subject: SubjectEntity;
}

export function ArchivedSubjectCard({
  subject,
}: Readonly<ArchivedSubjectCardProps>) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isRestoring, startRestoreTransition] = useTransition();
  const queryClient = useQueryClient();
  const router = useRouter();

  const archivedLabel = subject.archivedAt
    ? formatRelativeTime(subject.archivedAt)
    : null;

  function handleRestore() {
    startRestoreTransition(async () => {
      const result = await restoreSubject({ id: subject.id });

      if (result.success) {
        await queryClient.invalidateQueries({ queryKey: ["search-data"] });
        router.refresh();
        return;
      }

      toast.error(t(result.errorCode, result.errorParams));
    });
  }

  return (
    <>
      <Card className="border-border/60 bg-muted/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base leading-tight">
            <SubjectText
              value={subject.name}
              mode="truncate"
              className="block max-w-full"
            />
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
              <AsyncButtonContent
                pending={isRestoring}
                idleLabel="Restore"
                pendingLabel="Restoring..."
                idleIcon={<ArchiveRestore className="size-4" />}
              />
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
        onSuccess={() => {
          setDeleteOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
