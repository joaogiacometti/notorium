"use client";

import { HelpCircle, ImagePlus, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import {
  type FieldPath,
  type PathValue,
  type UseFormReturn,
  useWatch,
} from "react-hook-form";
import { toast } from "sonner";
import { uploadFlashcardOcclusionImage } from "@/app/actions/attachments";
import { OcclusionImageCanvas } from "@/components/flashcards/occlusion/occlusion-image-canvas";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { OcclusionRegion } from "@/features/flashcards/occlusion";
import type { FlashcardFormValues } from "@/features/flashcards/validation";
import { t } from "@/lib/server/server-action-errors";

interface OcclusionFieldsProps<TValues extends FlashcardFormValues> {
  form: UseFormReturn<TValues>;
  formId: string;
  onImageUploadPendingChange: (pending: boolean) => void;
}

function blobUrl(pathname: string): string {
  return `/api/attachments/blob?pathname=${encodeURIComponent(pathname)}`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Authoring fields for an image occlusion note: upload the source image, then
 * draw one mask per region. Each mask becomes an independently scheduled
 * sibling card.
 *
 * @example
 * <OcclusionFields form={form} formId="form-create-flashcard" ... />
 */
export function OcclusionFields<TValues extends FlashcardFormValues>({
  form,
  formId,
  onImageUploadPendingChange,
}: Readonly<OcclusionFieldsProps<TValues>>) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const imagePathnameField = "occlusionImagePathname" as FieldPath<TValues>;
  const regionsField = "occlusionRegions" as FieldPath<TValues>;

  const imagePathname = (useWatch({
    control: form.control,
    name: imagePathnameField,
  }) ?? "") as string;
  const regions = (useWatch({
    control: form.control,
    name: regionsField,
  }) ?? []) as OcclusionRegion[];

  function setRegions(next: OcclusionRegion[]) {
    form.setValue(
      regionsField,
      next as PathValue<TValues, FieldPath<TValues>>,
      {
        shouldDirty: true,
        shouldValidate: true,
      },
    );
  }

  async function handleFileSelected(file: File | undefined) {
    if (!file) {
      return;
    }
    setIsUploading(true);
    onImageUploadPendingChange(true);
    try {
      const dataBase64 = await readFileAsDataUrl(file);
      const result = await uploadFlashcardOcclusionImage({
        fileName: file.name,
        mimeType: file.type,
        dataBase64,
      });
      if (!result.success) {
        toast.error(t(result.errorCode, result.errorParams));
        return;
      }
      form.setValue(
        imagePathnameField,
        result.pathname as PathValue<TValues, FieldPath<TValues>>,
        { shouldDirty: true, shouldValidate: true },
      );
      // Masks are positioned for the previous image; a new image invalidates
      // them, so replacing the image clears all existing regions.
      setRegions([]);
    } finally {
      setIsUploading(false);
      onImageUploadPendingChange(false);
    }
  }

  function handleRegionChange(
    id: string,
    rect: Omit<OcclusionRegion, "id" | "label">,
  ) {
    setRegions(
      regions.map((region) =>
        region.id === id ? { ...region, ...rect } : region,
      ),
    );
  }

  function handleRegionCreate(rect: Omit<OcclusionRegion, "id" | "label">) {
    setRegions([...regions, { id: crypto.randomUUID(), ...rect }]);
  }

  const errors = form.formState.errors as Record<
    string,
    { message?: string } | undefined
  >;

  return (
    <Field data-invalid={Boolean(errors.occlusionImagePathname)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <FieldLabel htmlFor={`${formId}-occlusion`}>
            Image occlusion
          </FieldLabel>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Image occlusion help"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  <HelpCircle className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                Drag on the image to add a mask. Drag a mask to move it, or its
                edges to resize. Each mask becomes its own scheduled card.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {imagePathname ? (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <ImagePlus className="size-3.5" />
            )}
            Replace image
          </Button>
        ) : null}
      </div>

      <input
        ref={fileInputRef}
        id={`${formId}-occlusion`}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => {
          void handleFileSelected(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      {imagePathname ? (
        <OcclusionImageCanvas
          imageUrl={blobUrl(imagePathname)}
          regions={regions}
          onRegionChange={handleRegionChange}
          onRegionCreate={handleRegionCreate}
          onRegionRemove={(id) =>
            setRegions(regions.filter((region) => region.id !== id))
          }
        />
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex min-h-40 w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border text-muted-foreground transition-colors hover:border-(--primary) hover:text-foreground"
        >
          {isUploading ? (
            <Loader2 className="size-6 animate-spin" />
          ) : (
            <ImagePlus className="size-6" />
          )}
          <span className="text-sm">
            {isUploading ? "Uploading..." : "Upload an image to occlude"}
          </span>
        </button>
      )}

      {errors.occlusionImagePathname ? (
        <FieldError errors={[errors.occlusionImagePathname]} />
      ) : null}
      {errors.occlusionRegions ? (
        <FieldError errors={[errors.occlusionRegions]} />
      ) : null}
    </Field>
  );
}
