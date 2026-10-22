import { FileText, Workflow } from "lucide-react";
import type { DocumentKind } from "@/features/documents/types";

/** One icon per document kind, shared by the subject tree and source links.
 * @example const Icon = DOCUMENT_KIND_ICONS[document.kind];
 */
export const DOCUMENT_KIND_ICONS = {
  note: FileText,
  mindmap: Workflow,
} as const satisfies Record<DocumentKind, unknown>;
