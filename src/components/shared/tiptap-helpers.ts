import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/react";
import { toast } from "sonner";
import { uploadAttachmentImage } from "@/lib/attachments/upload-attachment-image";
import { LIMITS } from "@/lib/config/limits";
import {
  getPastedImageFile,
  getPastedImageFileName,
} from "@/lib/editor/clipboard-image";
import { resolveEmbeddableImageUrl } from "@/lib/editor/tiptap-image-url";
import { t } from "@/lib/server/server-action-errors";

export type EditorImageUploadContext = "notes" | "flashcards";

export interface EditorImageUploadTracker {
  start: () => void;
  finish: () => void;
}

export function isExternalEditorValueChange(
  value: string,
  lastEmittedValue: string,
) {
  return value !== lastEmittedValue;
}

export function shouldApplyNormalizedEditorValue(
  requestedValue: string,
  latestValue: string,
) {
  return latestValue === requestedValue;
}

function insertImage(editor: Editor, src: string) {
  editor.chain().focus().setImage({ src }).run();
}

export function handleEditorPaste({
  editor,
  event,
  imageUploadContext,
  isImageUploadPending,
  tracker,
}: {
  editor: Editor;
  event: ClipboardEvent;
  imageUploadContext: EditorImageUploadContext;
  isImageUploadPending: () => boolean;
  tracker?: EditorImageUploadTracker;
}) {
  const imageFile = getPastedImageFile(event);
  if (imageFile) {
    if (isImageUploadPending()) {
      return true;
    }

    void uploadPastedImage(editor, imageFile, imageUploadContext, tracker);
    return true;
  }

  const src = event.clipboardData?.getData("text/plain")?.trim() ?? "";
  const directImageUrl = resolveEmbeddableImageUrl(src);
  if (directImageUrl) {
    insertImage(editor, directImageUrl);
    return true;
  }

  return false;
}

export async function uploadPastedImage(
  editor: Editor,
  file: File,
  context: EditorImageUploadContext,
  tracker?: EditorImageUploadTracker,
) {
  tracker?.start();
  try {
    if (file.size > LIMITS.attachmentMaxBytes) {
      toast.error(
        t("limits.attachmentSizeLimit", { max: LIMITS.attachmentMaxBytes }),
      );
      return;
    }

    const namedFile = new File([file], getPastedImageFileName(file), {
      type: file.type,
    });
    const result = await uploadAttachmentImage(namedFile, context);

    if (!result.success) {
      toast.error(t(result.errorCode, result.errorParams));
      return;
    }

    insertImage(editor, result.url);
  } finally {
    tracker?.finish();
  }
}

export function createImageUrlPasteExtension(
  imageUploadContext: EditorImageUploadContext,
  isImageUploadPending: () => boolean,
  tracker?: EditorImageUploadTracker,
) {
  return Extension.create({
    name: "imageUrlPaste",
    addProseMirrorPlugins() {
      return [
        new Plugin({
          props: {
            handlePaste: (_, event) => {
              return handleEditorPaste({
                editor: this.editor,
                event,
                imageUploadContext,
                isImageUploadPending,
                tracker,
              });
            },
          },
        }),
      ];
    },
  });
}
