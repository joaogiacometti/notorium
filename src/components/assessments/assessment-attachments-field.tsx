"use client";

import { Paperclip, Trash2, Upload } from "lucide-react";
import { AttachmentFileIcon } from "@/components/assessments/attachment-file-icon";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ACCEPTED_ASSESSMENT_ATTACHMENT_TYPES } from "@/features/attachments/constants";
import { formatFileSize } from "@/features/attachments/format-file-size";
import type { AssessmentAttachmentEntity } from "@/lib/server/api-contracts";

interface AssessmentAttachmentsFieldProps {
  formId: string;
  existingAttachments?: AssessmentAttachmentEntity[];
  newFiles: File[];
  removedAttachmentIds: string[];
  onNewFilesChange: (files: File[]) => void;
  onRemovedAttachmentIdsChange: (ids: string[]) => void;
  disabled?: boolean;
}

export function AssessmentAttachmentsField({
  formId,
  existingAttachments = [],
  newFiles,
  removedAttachmentIds,
  onNewFilesChange,
  onRemovedAttachmentIdsChange,
  disabled,
}: Readonly<AssessmentAttachmentsFieldProps>) {
  const visibleAttachments = existingAttachments.filter(
    (attachment) => !removedAttachmentIds.includes(attachment.id),
  );

  function appendNewFiles(fileList: FileList | null) {
    if (!fileList) {
      return;
    }

    onNewFilesChange([...newFiles, ...Array.from(fileList)]);
  }

  function removeExistingAttachment(id: string) {
    onRemovedAttachmentIdsChange([...removedAttachmentIds, id]);
  }

  function removeNewFile(index: number) {
    onNewFilesChange(
      newFiles.filter((_file, currentIndex) => currentIndex !== index),
    );
  }

  const hasFiles = visibleAttachments.length > 0 || newFiles.length > 0;

  return (
    <Field>
      <div className="flex items-center justify-between gap-3">
        <div>
          <FieldLabel htmlFor={`${formId}-attachments`}>Attachments</FieldLabel>
        </div>
        <Button asChild type="button" variant="outline" size="sm">
          <label htmlFor={`${formId}-attachments`} className="cursor-pointer">
            <Upload className="size-3.5" />
            Add Files
          </label>
        </Button>
      </div>
      <Input
        id={`${formId}-attachments`}
        type="file"
        multiple
        accept={ACCEPTED_ASSESSMENT_ATTACHMENT_TYPES}
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          appendNewFiles(event.target.files);
          event.target.value = "";
        }}
      />
      {hasFiles ? (
        <div className="divide-y divide-border/40 rounded-lg border border-border/50 bg-muted/20 overflow-hidden">
          {visibleAttachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex min-w-0 items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/40"
            >
              <AttachmentFileIcon
                fileName={attachment.fileName}
                className="size-4 shrink-0"
              />
              <a
                href={`/api/attachments/assessment?id=${encodeURIComponent(attachment.id)}`}
                className="flex min-w-0 flex-1 items-center gap-2 text-sm text-foreground hover:underline"
              >
                <span className="truncate font-medium">
                  {attachment.fileName}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatFileSize(attachment.sizeBytes)}
                </span>
              </a>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="shrink-0 text-muted-foreground hover:text-(--intent-danger-text)"
                disabled={disabled}
                onClick={() => removeExistingAttachment(attachment.id)}
                title="Remove attachment"
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
          ))}
          {newFiles.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex min-w-0 items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/40"
            >
              <Paperclip className="size-4 shrink-0 text-muted-foreground" />
              <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                <span className="truncate font-medium">{file.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="shrink-0 text-muted-foreground hover:text-(--intent-danger-text)"
                disabled={disabled}
                onClick={() => removeNewFile(index)}
                title="Remove attachment"
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </Field>
  );
}
