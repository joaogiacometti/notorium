"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ImageIcon, Loader2, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { type MouseEvent, useRef, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  removeNoteAttachment,
  uploadNoteAttachments,
} from "@/app/actions/notes";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { NoteImageAttachmentEntity } from "@/lib/api/contracts";
import {
  type NoteAttachmentUploadForm,
  noteAttachmentAllowedTypes,
  noteAttachmentMaxFilesPerUpload,
  noteAttachmentMaxSizeBytes,
  noteAttachmentUploadSchema,
  validateNoteAttachmentFile,
} from "@/lib/validations/notes";

interface NoteImageAttachmentsProps {
  noteId: string;
  attachments: NoteImageAttachmentEntity[];
}

function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function NoteImageAttachments({
  noteId,
  attachments,
}: Readonly<NoteImageAttachmentsProps>) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const form = useForm<NoteAttachmentUploadForm>({
    resolver: zodResolver(noteAttachmentUploadSchema),
    defaultValues: {
      images: [],
    },
  });
  const selectedFiles = form.watch("images") ?? [];
  const [isRemoving, startRemoveTransition] = useTransition();
  const [removingAttachmentId, setRemovingAttachmentId] = useState<
    string | null
  >(null);
  const [attachmentToRemoveId, setAttachmentToRemoveId] = useState<
    string | null
  >(null);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [viewerAttachmentId, setViewerAttachmentId] = useState<string | null>(
    null,
  );
  const [viewerZoomOrigin, setViewerZoomOrigin] = useState("50% 50%");
  const [isViewerZoomed, setIsViewerZoomed] = useState(false);

  const viewerAttachment =
    attachments.find((attachment) => attachment.id === viewerAttachmentId) ??
    null;

  function clearSelectedFiles() {
    form.reset({
      images: [],
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function onSubmit(data: NoteAttachmentUploadForm) {
    const filesToUpload = data.images;

    try {
      const formData = new FormData();
      formData.set("noteId", noteId);

      for (const file of filesToUpload) {
        formData.append("images", file);
      }

      const result = await uploadNoteAttachments(formData);

      if (result.success) {
        toast.success(
          `${filesToUpload.length} image${filesToUpload.length === 1 ? "" : "s"} uploaded.`,
        );
        clearSelectedFiles();
        router.refresh();
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to upload images.");
    }
  }

  function onRequestRemove(attachmentId: string) {
    setAttachmentToRemoveId(attachmentId);
    setRemoveConfirmOpen(true);
  }

  function onRemoveConfirmOpenChange(open: boolean) {
    if (isRemoving) {
      return;
    }

    setRemoveConfirmOpen(open);

    if (!open) {
      setAttachmentToRemoveId(null);
    }
  }

  function onRemove() {
    if (!attachmentToRemoveId) {
      return;
    }

    setRemovingAttachmentId(attachmentToRemoveId);

    startRemoveTransition(async () => {
      try {
        const result = await removeNoteAttachment({ id: attachmentToRemoveId });

        if (result.success) {
          toast.success("Attachment removed.");
          setRemoveConfirmOpen(false);
          setAttachmentToRemoveId(null);
          router.refresh();
        } else if (result.error) {
          toast.error(result.error);
        }
      } catch {
        toast.error("Failed to remove attachment.");
      } finally {
        setRemovingAttachmentId(null);
      }
    });
  }

  function onViewerOpenChange(open: boolean) {
    if (!open) {
      setViewerAttachmentId(null);
      setViewerZoomOrigin("50% 50%");
      setIsViewerZoomed(false);
    }
  }

  function setZoomOriginFromPointer(event: MouseEvent<HTMLElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;

    setViewerZoomOrigin(`${x}% ${y}%`);
  }

  function onViewerMouseMove(event: MouseEvent<HTMLDivElement>) {
    setZoomOriginFromPointer(event);
  }

  function onViewerImageClick(event: MouseEvent<HTMLImageElement>) {
    setZoomOriginFromPointer(event);
    setIsViewerZoomed((current) => !current);
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ImageIcon className="size-4 text-primary" />
          <h2 className="text-base font-semibold">Attachments</h2>
        </div>
        <span className="text-xs text-muted-foreground">
          {attachments.length} image{attachments.length === 1 ? "" : "s"}
        </span>
      </div>

      <form
        id="form-note-attachments-upload"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FieldGroup className="mb-5 gap-3">
          <Controller
            name="images"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="form-note-attachments-images">
                  Images
                </FieldLabel>
                <Input
                  id="form-note-attachments-images"
                  ref={(element) => {
                    field.ref(element);
                    fileInputRef.current = element;
                  }}
                  type="file"
                  accept={noteAttachmentAllowedTypes.join(",")}
                  multiple
                  name={field.name}
                  onBlur={field.onBlur}
                  aria-invalid={fieldState.invalid}
                  disabled={form.formState.isSubmitting || isRemoving}
                  onChange={async (event) => {
                    const incomingFiles = Array.from(event.target.files ?? []);

                    if (
                      incomingFiles.length > noteAttachmentMaxFilesPerUpload
                    ) {
                      toast.error(
                        `You can upload up to ${noteAttachmentMaxFilesPerUpload} images at a time.`,
                      );
                    }

                    const limitedFiles = incomingFiles.slice(
                      0,
                      noteAttachmentMaxFilesPerUpload,
                    );
                    const validFiles: File[] = [];

                    for (const file of limitedFiles) {
                      const validationError = validateNoteAttachmentFile(file);

                      if (validationError) {
                        toast.error(`${file.name}: ${validationError}`);
                        continue;
                      }

                      validFiles.push(file);
                    }

                    field.onChange(validFiles);

                    if (validFiles.length === 0) {
                      return;
                    }

                    const isValid = await form.trigger("images");

                    if (!isValid) {
                      return;
                    }

                    await form.handleSubmit(onSubmit)();
                  }}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
          <p className="text-xs text-muted-foreground">
            JPG, PNG, WEBP, GIF. Up to{" "}
            {formatFileSize(noteAttachmentMaxSizeBytes)} each and{" "}
            {noteAttachmentMaxFilesPerUpload} images per upload.
          </p>
          {selectedFiles.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Selected: {selectedFiles.map((file) => file.name).join(", ")}
            </p>
          )}
          {form.formState.isSubmitting && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Uploading images...
            </p>
          )}
        </FieldGroup>
      </form>

      {attachments.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-3 py-8 text-center text-sm text-muted-foreground">
          No images attached yet.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="overflow-hidden rounded-lg border border-border/60"
            >
              <Image
                src={`/api/notes/${noteId}/attachments/${attachment.id}`}
                alt="Note attachment"
                className="h-44 w-full cursor-zoom-in object-cover"
                loading="lazy"
                width={704}
                height={352}
                unoptimized
                onClick={() => setViewerAttachmentId(attachment.id)}
              />
              <div className="flex items-center justify-between gap-2 p-2">
                <span className="text-xs text-muted-foreground">
                  {formatFileSize(attachment.sizeBytes)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs text-destructive hover:text-destructive"
                  onClick={() => onRequestRemove(attachment.id)}
                  disabled={isRemoving || form.formState.isSubmitting}
                >
                  {isRemoving && removingAttachmentId === attachment.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={removeConfirmOpen} onOpenChange={onRemoveConfirmOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove Attachment</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this image? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => onRemoveConfirmOpenChange(false)}
              disabled={isRemoving}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onRemove}
              disabled={isRemoving}
            >
              {isRemoving && <Loader2 className="size-4 animate-spin" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={viewerAttachmentId !== null}
        onOpenChange={onViewerOpenChange}
      >
        <DialogContent
          className="h-svh w-screen max-w-none border-none bg-black/95 p-0"
          showCloseButton={false}
          onMouseMove={onViewerMouseMove}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Attachment preview</DialogTitle>
          </DialogHeader>
          <button
            type="button"
            className="absolute right-4 top-4 z-10 inline-flex size-10 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
            onClick={() => setViewerAttachmentId(null)}
            aria-label="Close image viewer"
          >
            <X className="size-5" />
          </button>
          {viewerAttachment && (
            <div className="flex h-full w-full items-center justify-center overflow-hidden p-4 sm:p-8">
              <Image
                src={`/api/notes/${noteId}/attachments/${viewerAttachment.id}`}
                alt="Note attachment in fullscreen"
                className={`max-h-full w-auto max-w-full object-contain transition-transform duration-150 ${isViewerZoomed ? "cursor-zoom-out" : "cursor-zoom-in"}`}
                style={{
                  transformOrigin: viewerZoomOrigin,
                  transform: isViewerZoomed ? "scale(2)" : "scale(1)",
                }}
                onClick={onViewerImageClick}
                width={1600}
                height={1200}
                unoptimized
                priority
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
