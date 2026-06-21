"use client";

import { BookOpen, FileText, Loader2, Workflow } from "lucide-react";
import Link from "next/link";
import {
  type DocumentRowActionHandlers,
  DocumentRowMenu,
} from "@/components/documents/document-row-menu";
import { INDENT_REM } from "@/components/subjects/tree/subject-tree-constants";
import type { DraggedDocument } from "@/components/subjects/tree/use-subject-drag-and-drop";
import type { DocumentListItem } from "@/features/documents/types";
import { getDocumentDetailHref } from "@/lib/navigation/detail-page-back-link";
import { cn } from "@/lib/utils";

const DOCUMENT_ROW_ICONS = {
  note: FileText,
  mindmap: Workflow,
  book: BookOpen,
} as const;

interface DocumentRowsProps {
  documents: DocumentListItem[] | "loading" | undefined;
  depth: number;
  activeHref: string;
  documentActions: DocumentRowActionHandlers;
  draggedDocumentId: string | null;
  pendingMoveId: string | null;
  onDocumentDragStart: (document: DraggedDocument) => void;
  onDragEnd: () => void;
}

/**
 * The note and mindmap rows nested under an expanded subject in the tree. Each
 * row links to its document, can be dragged to another subject, and carries the
 * same kebab actions as the document's detail-page header menu.
 */
export function DocumentRows({
  documents,
  depth,
  activeHref,
  documentActions,
  draggedDocumentId,
  pendingMoveId,
  onDocumentDragStart,
  onDragEnd,
}: Readonly<DocumentRowsProps>) {
  if (documents === "loading") {
    return (
      <div
        className="flex items-center gap-2 py-1.5 text-xs text-muted-foreground"
        style={{ paddingLeft: `${depth * INDENT_REM + 1.5}rem` }}
      >
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
        Loading…
      </div>
    );
  }

  if (!documents || documents.length === 0) {
    return null;
  }

  return (
    <>
      {documents.map((document) => {
        const href = getDocumentDetailHref(document);
        const Icon = DOCUMENT_ROW_ICONS[document.kind];
        const isActive = href === activeHref;
        const isDragging = draggedDocumentId === document.id;
        const isMoving = pendingMoveId === document.id;

        return (
          <div
            key={`${document.kind}-${document.id}`}
            className={cn(
              "group flex items-center gap-1 rounded-md pr-1 transition-colors",
              isActive
                ? "bg-muted/60 text-foreground"
                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              isDragging && "opacity-50",
            )}
            style={{ paddingLeft: `${depth * INDENT_REM + 1.5}rem` }}
          >
            <Link
              href={href}
              draggable
              onDragStart={(event) => {
                event.stopPropagation();
                onDocumentDragStart({
                  kind: document.kind,
                  id: document.id,
                  sourceSubjectId: document.subjectId,
                });
              }}
              onDragEnd={onDragEnd}
              aria-current={isActive ? "page" : undefined}
              className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-sm focus-visible:outline-none"
            >
              {isMoving ? (
                <Loader2
                  className="size-3.5 shrink-0 animate-spin"
                  aria-hidden
                />
              ) : (
                <Icon className="size-3.5 shrink-0" aria-hidden />
              )}
              <span className="min-w-0 truncate" title={document.title}>
                {document.title}
              </span>
            </Link>
            <DocumentRowMenu item={document} {...documentActions} />
          </div>
        );
      })}
    </>
  );
}
