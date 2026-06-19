"use server";

import { getRecentDocumentsForUser } from "@/features/documents/queries";
import type { DocumentKind } from "@/features/documents/types";
import { getAuthenticatedUserId } from "@/lib/auth/auth";

export interface OpenableDocument {
  id: string;
  title: string;
  kind: DocumentKind;
}

const OPENABLE_DOCUMENTS_LIMIT = 200;

/**
 * Lists the user's notes and mindmaps (most recent first) for the command
 * palette's "open document in window" picker. Returns only id/title/kind since
 * the window loads full content lazily by id.
 *
 * @example
 * const documents = await getOpenableDocuments();
 */
export async function getOpenableDocuments(): Promise<OpenableDocument[]> {
  const userId = await getAuthenticatedUserId();
  const documents = await getRecentDocumentsForUser(
    userId,
    OPENABLE_DOCUMENTS_LIMIT,
  );
  return documents.map((document) => ({
    id: document.id,
    title: document.title,
    kind: document.kind,
  }));
}
