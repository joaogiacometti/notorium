"use client";

import { PdfAnnotationSubtype } from "@embedpdf/models";
import type { AnnotationTransferItem } from "@embedpdf/plugin-annotation";
import { useAnnotation } from "@embedpdf/plugin-annotation/react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  deleteBookAnnotation,
  saveBookAnnotation,
} from "@/app/actions/library-annotations";
import { HIGHLIGHT_CATEGORY } from "@/components/library/book-reader-annotation-config";
import type { BookAnnotationDto } from "@/features/library-annotations/types";
import type { HighlightAnnotationInput } from "@/features/library-annotations/validation";
import { t } from "@/lib/server/server-action-errors";

interface UseReaderAnnotationsArgs {
  documentId: string;
  bookId: string;
  initialAnnotations: BookAnnotationDto[];
}

/**
 * Sanitizes an annotation for the Server Action boundary. EmbedPDF annotation
 * objects carry `Date` instances for `created`/`modified`, but the server-side
 * Zod schema expects ISO 8601 strings. Next.js Server Actions use a binary
 * transport that preserves `Date` objects, so a JSON round-trip is required:
 * `JSON.stringify` converts Date → ISO string and drops non-serializable
 * artifacts (functions, proxies) in one pass.
 */
function toSavePayload(annotation: unknown): HighlightAnnotationInput {
  return JSON.parse(JSON.stringify(annotation)) as HighlightAnnotationInput;
}

/**
 * Adapts DTOs from the database into the shape EmbedPDF's import API expects.
 * The DTO's `annotation` field is `Record<string, unknown>` (loose JSON) while
 * EmbedPDF expects `PdfAnnotationObject`; at runtime they match because the
 * stored JSON was originally produced by the same plugin. The intermediate
 * `unknown` cast bridges the type gap between incompatible nominal types.
 */
function toAnnotationTransferItems(
  annotations: BookAnnotationDto[],
): AnnotationTransferItem[] {
  const items: unknown = annotations.map((entry) => ({
    annotation: {
      ...entry.annotation,
      custom: {
        ...(entry.annotation.custom as Record<string, unknown> | undefined),
        category: HIGHLIGHT_CATEGORY,
      },
    },
  }));
  return items as AnnotationTransferItem[];
}

/**
 * Bridges the reader's in-memory highlights to the database: it imports the
 * highlights saved on a previous visit when the document is ready, then mirrors
 * every later create/update/delete back to the server. Persistence is keyed by
 * the EmbedPDF annotation id, so the same handler covers both a fresh highlight
 * and a note edit on an existing one.
 */
export function useReaderAnnotations({
  documentId,
  bookId,
  initialAnnotations,
}: UseReaderAnnotationsArgs) {
  const { provides: annotationApi } = useAnnotation(documentId);
  const importedRef = useRef(false);
  // Highlights restored from the server are already persisted, so their initial
  // `create` event must not echo back as a redundant save.
  const restoredUids = useRef(new Set(initialAnnotations.map((a) => a.uid)));

  useEffect(() => {
    if (!annotationApi || importedRef.current) return;
    importedRef.current = true;
    if (initialAnnotations.length === 0) return;
    annotationApi.importAnnotations(
      toAnnotationTransferItems(initialAnnotations),
    );
  }, [annotationApi, initialAnnotations]);

  useEffect(() => {
    if (!annotationApi) return;

    async function persistSave(annotation: unknown) {
      const result = await saveBookAnnotation({
        bookId,
        annotation: toSavePayload(annotation),
      });
      if (!result.success) toast.error(t(result.errorCode, result.errorParams));
    }

    async function persistDelete(annotationUid: string) {
      const result = await deleteBookAnnotation({ bookId, annotationUid });
      if (!result.success) toast.error(t(result.errorCode, result.errorParams));
    }

    const unsubscribe = annotationApi.onAnnotationEvent((event) => {
      if (event.type === "loaded") return;
      if (event.annotation.type !== PdfAnnotationSubtype.HIGHLIGHT) return;

      if (event.type === "delete") {
        restoredUids.current.delete(event.annotation.id);
        void persistDelete(event.annotation.id);
        return;
      }

      // Wait for the change to commit to the engine, and skip the import echo
      // for highlights that were already on the server.
      if (!event.committed) return;
      if (
        event.type === "create" &&
        restoredUids.current.has(event.annotation.id)
      ) {
        return;
      }
      void persistSave(event.annotation);
    });

    return unsubscribe;
  }, [annotationApi, bookId]);
}
