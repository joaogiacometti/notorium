"use client";

import { Download, Paperclip, Trash2, Upload, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ChangeEvent, useRef, useState } from "react";
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
import { cn } from "@/lib/utils";

interface AssessmentAttachmentsSectionProps {
  assessmentId: string;
  initialAttachments: AssessmentAttachmentEntity[];
}

export function AssessmentAttachmentsSection({
  assessmentId,
  initialAttachments,
}: Readonly<AssessmentAttachmentsSectionProps>) {
  const router = useRouter();
  const [attachments, setAttachments] =
    useState<AssessmentAttachmentEntity[]>(initialAttachments);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [deleteTarget, setDeleteTarget] =
    useState<AssessmentAttachmentEntity | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function uploadFiles(files: File[]) {
    if (files.length === 0 || isUploading) {
      return;
    }
    setIsUploading(true);
    try {
      const result = await uploadAssessmentFiles(assessmentId, files);
      if (result.success) {
        setAttachments((prev) => [...prev, ...result.attachments]);
        router.refresh();
        return;
      }
      if (result.attachments.length > 0) {
        setAttachments((prev) => [...prev, ...result.attachments]);
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

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setIsDragOver(false);
    void uploadFiles(Array.from(event.dataTransfer.files));
  }

  function handleDragOver(event: React.DragEvent) {
    event.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  function handleAttachmentDeleted(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
    setDeleteTarget(null);
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-border/70 bg-card/85 p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Paperclip className="size-3.5" />
          Attachments
          {attachments.length > 0 && (
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium normal-case text-muted-foreground">
              {attachments.length}
            </span>
          )}
        </h3>
        <Button asChild type="button" variant="outline" size="sm">
          <label
            htmlFor="assessment-detail-attachments"
            className="cursor-pointer"
          >
            <Upload className="size-3.5" />
            <AsyncButtonContent
              pending={isUploading}
              idleLabel="Add files"
              pendingLabel="Uploading..."
            />
          </label>
        </Button>
        <input
          ref={fileInputRef}
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
        <AttachmentList
          attachments={attachments}
          isDragOver={isDragOver}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDeleteTarget={setDeleteTarget}
        />
      ) : (
        <DropZoneEmpty
          isDragOver={isDragOver}
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        />
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

interface AttachmentListProps {
  attachments: AssessmentAttachmentEntity[];
  isDragOver: boolean;
  onDrop: (event: React.DragEvent) => void;
  onDragOver: (event: React.DragEvent) => void;
  onDragLeave: () => void;
  onDeleteTarget: (attachment: AssessmentAttachmentEntity) => void;
}

function AttachmentList({
  attachments,
  isDragOver,
  onDrop,
  onDragOver,
  onDragLeave,
  onDeleteTarget,
}: Readonly<AttachmentListProps>) {
  return (
    <ul
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={cn(
        "divide-y divide-border/40 overflow-hidden rounded-lg border bg-muted/20 transition-colors",
        isDragOver ? "border-foreground/30" : "border-border/50",
      )}
    >
      {attachments.map((attachment) => (
        <li
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
            <span className="truncate font-medium">{attachment.fileName}</span>
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
              onClick={() => onDeleteTarget(attachment)}
              title="Delete attachment"
              aria-label={`Delete ${attachment.fileName}`}
            >
              <Trash2 className="size-3" />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

interface DropZoneEmptyProps {
  isDragOver: boolean;
  onClick: () => void;
  onDrop: (event: React.DragEvent) => void;
  onDragOver: (event: React.DragEvent) => void;
  onDragLeave: () => void;
}

function DropZoneEmpty({
  isDragOver,
  onClick,
  onDrop,
  onDragOver,
  onDragLeave,
}: Readonly<DropZoneEmptyProps>) {
  return (
    <button
      type="button"
      onClick={onClick}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={cn(
        "flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-border/50 py-6 text-center transition-colors",
        isDragOver
          ? "border-foreground/30 bg-muted/30"
          : "hover:border-foreground/30 hover:bg-muted/20",
      )}
    >
      <UploadCloud
        className={cn(
          "size-6",
          isDragOver ? "text-foreground/70" : "text-muted-foreground/50",
        )}
      />
      <p
        className={cn(
          "text-sm",
          isDragOver ? "text-foreground/70" : "text-muted-foreground",
        )}
      >
        Drag files here or click to upload
      </p>
    </button>
  );
}
