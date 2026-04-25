"use client";

import { Download, Paperclip, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ChangeEvent, useState } from "react";
import { toast } from "sonner";
import { uploadAssessmentFiles } from "@/components/assessments/assessment-attachment-actions";
import { AttachmentFileIcon } from "@/components/assessments/attachment-file-icon";
import { DeleteAssessmentAttachmentDialog } from "@/components/assessments/delete-assessment-attachment-dialog";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { Button } from "@/components/ui/button";
import { ACCEPTED_ASSESSMENT_ATTACHMENT_TYPES } from "@/features/attachments/constants";
import { formatFileSize } from "@/features/attachments/format-file-size";
import type { AssessmentAttachmentEntity } from "@/lib/server/api-contracts";
import { resolveActionErrorMessage } from "@/lib/server/server-action-errors";

interface AssessmentAttachmentsPanelProps {
  assessmentId: string;
  attachments: AssessmentAttachmentEntity[];
  onAttachmentsChange: (attachments: AssessmentAttachmentEntity[]) => void;
}

/**
 * Renders assessment attachment downloads plus detail-page add and delete controls.
 *
 * @example
 * <AssessmentAttachmentsPanel assessmentId={assessment.id} attachments={attachments} onAttachmentsChange={setAttachments} />
 */
export function AssessmentAttachmentsPanel({
  assessmentId,
  attachments,
  onAttachmentsChange,
}: Readonly<AssessmentAttachmentsPanelProps>) {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] =
    useState<AssessmentAttachmentEntity | null>(null);

  async function uploadFiles(files: File[]) {
    if (files.length === 0 || isUploading) {
      return;
    }

    setIsUploading(true);

    try {
      const result = await uploadAssessmentFiles(assessmentId, files);
      if (result.success) {
        onAttachmentsChange([...attachments, ...result.attachments]);
        router.refresh();
        return;
      }

      if (result.attachments.length > 0) {
        onAttachmentsChange([...attachments, ...result.attachments]);
        router.refresh();
      }

      toast.error(resolveActionErrorMessage(result));
    } finally {
      setIsUploading(false);
    }
  }

  function handleFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    void uploadFiles(files);
  }

  function handleAttachmentDeleted(id: string) {
    onAttachmentsChange(
      attachments.filter((attachment) => attachment.id !== id),
    );
    setDeleteTarget(null);
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
          <Paperclip className="size-4 text-muted-foreground" />
          Attachments
          {attachments.length > 0 && (
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
              {attachments.length}
            </span>
          )}
        </h2>
        <Button asChild type="button" variant="outline" size="sm">
          <label
            htmlFor="assessment-detail-attachments"
            className="cursor-pointer"
          >
            <Upload className="size-3.5" />
            <AsyncButtonContent
              pending={isUploading}
              idleLabel="Add Files"
              pendingLabel="Uploading..."
            />
          </label>
        </Button>
        <input
          id="assessment-detail-attachments"
          type="file"
          multiple
          accept={ACCEPTED_ASSESSMENT_ATTACHMENT_TYPES}
          className="sr-only"
          disabled={isUploading}
          onChange={handleFileInputChange}
        />
      </div>
      {attachments.length > 0 ? (
        <div className="divide-y divide-border/40 rounded-lg border border-border/50 bg-muted/20 overflow-hidden">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex min-w-0 items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/40"
            >
              <AttachmentFileIcon
                fileName={attachment.fileName}
                className="size-5 shrink-0"
              />
              <a
                href={`/api/attachments/assessment?id=${encodeURIComponent(attachment.id)}`}
                className="flex min-w-0 flex-1 items-center gap-2 text-sm hover:underline"
              >
                <span className="truncate font-medium">
                  {attachment.fileName}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatFileSize(attachment.sizeBytes)}
                </span>
              </a>
              <div className="flex shrink-0 items-center gap-0.5">
                <Button
                  asChild
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  title="Download"
                  aria-label={`Download ${attachment.fileName}`}
                >
                  <a
                    href={`/api/attachments/assessment?id=${encodeURIComponent(attachment.id)}`}
                  >
                    <Download className="size-3" />
                  </a>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground hover:text-(--intent-danger-text)"
                  onClick={() => setDeleteTarget(attachment)}
                  title="Delete attachment"
                  aria-label={`Delete ${attachment.fileName}`}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border/50 py-6 text-center">
          <Paperclip className="size-5 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            No attachments added yet
          </p>
        </div>
      )}
      <DeleteAssessmentAttachmentDialog
        attachment={deleteTarget}
        open={deleteTarget !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setDeleteTarget(null);
          }
        }}
        onDeleted={handleAttachmentDeleted}
      />
    </div>
  );
}
