import type { QueryClient } from "@tanstack/react-query";
import type { z } from "zod";
import { deleteNote, editNote } from "@/app/actions/notes";
import { deletePdf, renamePdf } from "@/app/actions/pdfs";
import type { DocumentKind } from "@/features/documents/types";
import { editNoteSchema } from "@/features/notes/validation";
import { pdfTitleFormSchema } from "@/features/pdfs/validation";
import { invalidateDocumentViews } from "@/lib/client-cache/invalidation";
import type { ActionErrorResult } from "@/lib/server/server-action-errors";

type DocumentActionResult = Promise<{ success: true } | ActionErrorResult>;

interface DocumentKindActions {
  /** Singular name shown in dialogs, such as "Rename Note". */
  label: string;
  titleSchema: z.ZodType<{ title: string }, { title: string }>;
  rename: (id: string, title: string) => DocumentActionResult;
  remove: (id: string) => DocumentActionResult;
}

export const DOCUMENT_KIND_ACTIONS = {
  note: {
    label: "Note",
    titleSchema: editNoteSchema.pick({ title: true }),
    rename: (id, title) => editNote({ id, title }),
    remove: (id) => deleteNote({ id }),
  },
  pdf: {
    label: "PDF",
    titleSchema: pdfTitleFormSchema,
    rename: (id, title) => renamePdf({ id, title }),
    remove: (id) => deletePdf({ id }),
  },
} satisfies Record<DocumentKind, DocumentKindActions>;

/**
 * Runs a rename or delete and, once it succeeds, refreshes the dependent
 * client views through the shared document invalidation policy.
 */
export async function runDocumentAction(
  queryClient: QueryClient,
  action: () => DocumentActionResult,
  subjectId?: string,
): DocumentActionResult {
  const result = await action();
  if (result.success) {
    await invalidateDocumentViews(
      queryClient,
      subjectId ? [subjectId] : undefined,
    );
  }
  return result;
}
