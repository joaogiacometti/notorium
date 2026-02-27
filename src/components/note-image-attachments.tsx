"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ImageIcon, Loader2, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  type MouseEvent,
  type ClipboardEvent as ReactClipboardEvent,
  type DragEvent as ReactDragEvent,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
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
} from "@/lib/validations/notes";

interface NoteImageAttachmentsProps {
  noteId: string;
  attachments: NoteImageAttachmentEntity[];
}

function getClipboardImageFiles(clipboardData: DataTransfer | null): File[] {
  if (!clipboardData) {
    return [];
  }

  const itemFiles = Array.from(clipboardData.items)
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null);

  if (itemFiles.length > 0) {
    return itemFiles;
  }

  return Array.from(clipboardData.files).filter((file) =>
    file.type.startsWith("image/"),
  );
}

function isTypingElement(activeElement: Element | null): boolean {
  if (!activeElement) {
    return false;
  }

  if (
    activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement
  ) {
    return true;
  }

  return (
    (activeElement instanceof HTMLElement && activeElement.isContentEditable) ||
    activeElement.closest("[contenteditable='true']") !== null
  );
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
  const dropZoneRef = useRef<HTMLFieldSetElement>(null);
  const isBusyRef = useRef(false);
  const stageIncomingFilesRef = useRef<(incomingFiles: File[]) => void>(
    () => {},
  );
  const form = useForm<NoteAttachmentUploadForm>({
    resolver: zodResolver(noteAttachmentUploadSchema),
    defaultValues: {
      images: [],
    },
  });
  const selectedFiles = form.watch("images") ?? [];
  const [isDragActive, setIsDragActive] = useState(false);
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

  const isBusy = form.formState.isSubmitting || isRemoving;
  isBusyRef.current = isBusy;

  function clearSelectedFiles() {
    form.reset({
      images: [],
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function stageIncomingFiles(incomingFiles: File[]) {
    if (incomingFiles.length === 0 || isBusy) {
      return;
    }

    const currentFiles = form.getValues("images") ?? [];
    const mergedFiles = [...currentFiles, ...incomingFiles];

    if (mergedFiles.length > noteAttachmentMaxFilesPerUpload) {
      toast.error(
        `You can upload up to ${noteAttachmentMaxFilesPerUpload} images at a time.`,
      );
    }

    const stagedFiles = mergedFiles.slice(0, noteAttachmentMaxFilesPerUpload);
    form.setValue("images", stagedFiles, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }
  stageIncomingFilesRef.current = stageIncomingFiles;

  function removeStagedFile(index: number) {
    const currentFiles = form.getValues("images") ?? [];
    const nextFiles = currentFiles.filter(
      (_, fileIndex) => fileIndex !== index,
    );
    form.setValue("images", nextFiles, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });

    if (nextFiles.length === 0 && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function uploadFiles(filesToUpload: File[]) {
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

  async function onSubmit(data: NoteAttachmentUploadForm) {
    await uploadFiles(data.images);
  }

  function handleUploadClick() {
    void form.handleSubmit(onSubmit)();
  }

  function handleDropZonePaste(event: ReactClipboardEvent<HTMLButtonElement>) {
    const clipboardImageFiles = getClipboardImageFiles(event.clipboardData);

    if (clipboardImageFiles.length === 0) {
      return;
    }

    event.preventDefault();
    stageIncomingFiles(clipboardImageFiles);
  }

  function handleDropZoneClick() {
    if (isBusy) {
      return;
    }
    fileInputRef.current?.click();
  }

  function handleDropZoneDragOver(event: ReactDragEvent<HTMLFieldSetElement>) {
    event.preventDefault();

    if (!isBusy) {
      setIsDragActive(true);
    }
  }

  function handleDropZoneDragLeave(event: ReactDragEvent<HTMLFieldSetElement>) {
    event.preventDefault();
    setIsDragActive(false);
  }

  function handleDropZoneDrop(event: ReactDragEvent<HTMLFieldSetElement>) {
    event.preventDefault();
    setIsDragActive(false);

    if (isBusy) {
      return;
    }

    const droppedFiles = Array.from(event.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/"),
    );
    stageIncomingFiles(droppedFiles);
  }

  useEffect(() => {
    const handleWindowPaste = (event: ClipboardEvent) => {
      if (isBusyRef.current) {
        return;
      }

      const clipboardImageFiles = getClipboardImageFiles(event.clipboardData);

      if (clipboardImageFiles.length === 0) {
        return;
      }

      const activeElement = document.activeElement;
      const isFocusInsideDropZone =
        activeElement instanceof Node &&
        dropZoneRef.current?.contains(activeElement);

      if (isTypingElement(activeElement) && !isFocusInsideDropZone) {
        return;
      }

      event.preventDefault();
      stageIncomingFilesRef.current(clipboardImageFiles);
    };

    window.addEventListener("paste", handleWindowPaste);

    return () => {
      window.removeEventListener("paste", handleWindowPaste);
    };
  }, []);

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
                  className="sr-only"
                  tabIndex={-1}
                  disabled={isBusy}
                  onChange={(event) => {
                    const incomingFiles = Array.from(event.target.files ?? []);
                    stageIncomingFiles(incomingFiles);
                  }}
                />
                <fieldset
                  ref={dropZoneRef}
                  data-invalid={fieldState.invalid || undefined}
                  className="m-0 min-w-0 border-0 p-0 data-[invalid]:[&_button]:border-destructive"
                  onDragOver={handleDropZoneDragOver}
                  onDragLeave={handleDropZoneDragLeave}
                  onDrop={handleDropZoneDrop}
                >
                  <button
                    type="button"
                    className={`w-full rounded-lg border border-dashed px-4 py-6 text-left transition-colors ${
                      isDragActive
                        ? "border-primary bg-primary/5"
                        : "border-border/60 bg-muted/20 hover:bg-muted/30"
                    }`}
                    onClick={handleDropZoneClick}
                    onPaste={handleDropZonePaste}
                    disabled={isBusy}
                  >
                    <div className="flex items-start gap-3">
                      <ImageIcon className="mt-0.5 size-4 text-primary" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          Click, drag, or paste images
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PNG, JPG, WEBP, GIF. Up to{" "}
                          {noteAttachmentMaxFilesPerUpload} files,{" "}
                          {formatFileSize(noteAttachmentMaxSizeBytes)} each.
                        </p>
                      </div>
                    </div>
                  </button>
                </fieldset>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Staged ({selectedFiles.length})
              </p>
              <div className="space-y-1.5">
                {selectedFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                    className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/20 px-2.5 py-1.5"
                  >
                    <span className="truncate text-xs">{file.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        disabled={isBusy}
                        onClick={() => removeStagedFile(index)}
                        aria-label={`Remove ${file.name}`}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={clearSelectedFiles}
              disabled={isBusy || selectedFiles.length === 0}
            >
              Clear
            </Button>
            <Button
              type="button"
              onClick={handleUploadClick}
              disabled={isBusy || selectedFiles.length === 0}
            >
              {form.formState.isSubmitting && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Upload
            </Button>
            {form.formState.isSubmitting && (
              <span className="text-xs text-muted-foreground">
                Uploading images...
              </span>
            )}
          </div>
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
