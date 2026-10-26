"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { DOCUMENT_KIND_ICONS } from "@/components/documents/document-kind-icons";
import {
  type DocumentRowActionHandlers,
  DocumentRowMenu,
} from "@/components/documents/document-row-menu";
import { INDENT_REM } from "@/components/subjects/tree/subject-tree-constants";
import type { DraggedDocument } from "@/components/subjects/tree/use-subject-drag-and-drop";
import { Button } from "@/components/ui/button";
import type { DocumentListItem } from "@/features/documents/types";
import { getDocumentDetailHref } from "@/lib/navigation/detail-page-back-link";
import { cn } from "@/lib/utils";

interface DocumentRowsProps {
  documents: DocumentListItem[] | "loading" | "error" | undefined;
  depth: number;
  activeHref: string;
  documentActions: DocumentRowActionHandlers;
  draggedDocumentId: string | null;
  pendingMoveId: string | null;
  onDocumentDragStart: (document: DraggedDocument) => void;
  onDragEnd: () => void;
  onRetry: () => void;
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
  onRetry,
}: Readonly<DocumentRowsProps>) {
  if (documents === "error") {
    return (
      <div
        role="alert"
        className="flex items-center gap-2 py-1.5 text-xs text-muted-foreground"
        style={{ paddingLeft: `${depth * INDENT_REM + 1.5}rem` }}
      >
        Couldn't load documents.
        <Button type="button" variant="link" size="xs" onClick={onRetry}>
          Retry
        </Button>
      </div>
    );
  }

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
        const Icon = DOCUMENT_KIND_ICONS[document.kind];
        const isActive = href === activeHref;
        const isDragging = draggedDocumentId === document.id;
        const isMoving = pendingMoveId === document.id;

        return (
          <div
            key={`${document.kind}-${document.id}`}
            className={cn(
              "group flex items-center gap-1 rounded-md pr-1 transition-colors",
              isActive
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
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
