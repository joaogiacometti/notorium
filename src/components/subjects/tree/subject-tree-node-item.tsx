"use client";

import { ChevronDown, ChevronRight, Folder, Loader2 } from "lucide-react";
import Link from "next/link";
import type { DragEvent } from "react";
import type { DocumentRowActionHandlers } from "@/components/documents/document-row-menu";
import { SubjectActionsMenu } from "@/components/subjects/tree/subject-tree-actions-menu";
import { INDENT_REM } from "@/components/subjects/tree/subject-tree-constants";
import { DocumentRows } from "@/components/subjects/tree/subject-tree-document-rows";
import type {
  SubjectDeleteTarget,
  SubjectDocumentsState,
  SubjectEditTarget,
} from "@/components/subjects/tree/subject-tree-types";
import type { DraggedDocument } from "@/components/subjects/tree/use-subject-drag-and-drop";
import { Button } from "@/components/ui/button";
import { getFlashcardReviewSessionHref } from "@/lib/navigation/detail-page-back-link";
import type { SubjectTreeNode } from "@/lib/server/api-contracts";
import { cn } from "@/lib/utils";

interface SubjectTreeNodeItemProps {
  node: SubjectTreeNode;
  depth: number;
  expandedIds: Set<string>;
  activeSubjectId?: string;
  activeHref: string;
  documentsBySubject: SubjectDocumentsState;
  documentActions: DocumentRowActionHandlers;
  draggedSubjectId: string | null;
  draggedDocumentId: string | null;
  dropTargetId: string | null;
  pendingMoveId: string | null;
  onToggle: (subjectId: string) => void;
  onRetryDocuments: (subjectId: string) => void;
  onCreateChild: (parentSubjectId: string) => void;
  onCreateNote: (subjectId: string) => void;
  onCreatePdf: (subjectId: string) => void;
  onCreateFlashcard: (subjectId: string) => void;
  onEdit: (subject: SubjectEditTarget) => void;
  onDelete: (subject: SubjectDeleteTarget) => void;
  onDragStart: (subjectId: string) => void;
  onDocumentDragStart: (document: DraggedDocument) => void;
  onDragTarget: (targetId: string) => void;
  onDropTarget: (targetId: string) => void;
  onDragEnd: () => void;
}

export function SubjectTreeNodeItem(props: Readonly<SubjectTreeNodeItemProps>) {
  const {
    node,
    depth,
    expandedIds,
    activeSubjectId,
    activeHref,
    documentsBySubject,
    documentActions,
    draggedSubjectId,
    draggedDocumentId,
    dropTargetId,
    pendingMoveId,
    onToggle,
    onRetryDocuments,
    onCreateChild,
    onCreateNote,
    onCreatePdf,
    onCreateFlashcard,
    onEdit,
    onDelete,
    onDragStart,
    onDocumentDragStart,
    onDragTarget,
    onDropTarget,
    onDragEnd,
  } = props;

  const isExpanded = expandedIds.has(node.id);
  const isSelected = activeSubjectId === node.id;
  const hasChildSubjects = node.children.length > 0;
  const isExpandable = hasChildSubjects || node.documentCount > 0;
  const isDragging = draggedSubjectId === node.id;
  const isDropTarget = dropTargetId === node.id;
  const isMoving = pendingMoveId === node.id;
  const documents = documentsBySubject.get(node.id);

  return (
    <div>
      <div
        data-subject-name={node.name}
        className={cn(
          "group flex items-center gap-1 rounded-md pr-1 transition-colors",
          isSelected
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
          isDragging && "opacity-50",
          isDropTarget && "bg-primary/5 ring-1 ring-primary/60",
        )}
        style={{ paddingLeft: `${depth * INDENT_REM}rem` }}
      >
        <ExpandButton
          isExpandable={isExpandable}
          isExpanded={isExpanded}
          onToggle={() => onToggle(node.id)}
        />
        <SubjectNodeLabel
          node={node}
          isMoving={isMoving}
          onToggle={isExpandable ? () => onToggle(node.id) : undefined}
          onDragStart={onDragStart}
          onDragTarget={onDragTarget}
          onDropTarget={onDropTarget}
          onDragEnd={onDragEnd}
        />
        <DueReviewBadge subjectId={node.id} dueCount={node.dueFlashcardCount} />
        <SubjectActionsMenu
          node={node}
          onCreateChild={onCreateChild}
          onCreateNote={onCreateNote}
          onCreatePdf={onCreatePdf}
          onCreateFlashcard={onCreateFlashcard}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>

      {isExpanded ? (
        <div>
          {node.children.map((child) => (
            <SubjectTreeNodeItem
              key={child.id}
              {...props}
              node={child}
              depth={depth + 1}
            />
          ))}
          <DocumentRows
            documents={documents}
            depth={depth + 1}
            activeHref={activeHref}
            documentActions={documentActions}
            draggedDocumentId={draggedDocumentId}
            pendingMoveId={pendingMoveId}
            onDocumentDragStart={onDocumentDragStart}
            onDragEnd={onDragEnd}
            onRetry={() => onRetryDocuments(node.id)}
          />
        </div>
      ) : null}
    </div>
  );
}

interface SubjectNodeLabelProps {
  node: SubjectTreeNode;
  isMoving: boolean;
  onToggle?: () => void;
  onDragStart: (subjectId: string) => void;
  onDragTarget: (targetId: string) => void;
  onDropTarget: (targetId: string) => void;
  onDragEnd: () => void;
}

/**
 * The subject label inside a tree row. Subjects have no page (the sidebar fully
 * manages their contents), so clicking the label toggles the folder like the
 * chevron. The label stays a draggable span rather than a button because
 * Firefox does not start drags on `<button draggable>`; the chevron remains the
 * keyboard-accessible expand control.
 */
function SubjectNodeLabel({
  node,
  isMoving,
  onToggle,
  onDragStart,
  onDragTarget,
  onDropTarget,
  onDragEnd,
}: Readonly<SubjectNodeLabelProps>) {
  const dragProps = {
    draggable: true,
    onDragStart: (event: DragEvent<HTMLElement>) => {
      event.stopPropagation();
      onDragStart(node.id);
    },
    onDragOver: (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      onDragTarget(node.id);
    },
    onDrop: (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      onDropTarget(node.id);
    },
    onDragEnd,
  };

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the chevron button is the keyboard equivalent of this mouse shortcut.
    // biome-ignore lint/a11y/noStaticElementInteractions: see above; a button would break dragging in Firefox.
    <span
      {...dragProps}
      onClick={onToggle}
      className={cn(
        "flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left text-sm focus-visible:outline-none",
        onToggle ? "cursor-pointer" : "cursor-default",
      )}
    >
      {isMoving ? (
        <Loader2
          className="size-3.5 shrink-0 animate-spin text-muted-foreground"
          aria-hidden
        />
      ) : (
        <Folder
          className="size-3.5 shrink-0 text-muted-foreground"
          aria-hidden
        />
      )}
      <span className="min-w-0 truncate font-medium" title={node.path}>
        {node.name}
      </span>
    </span>
  );
}

interface ExpandButtonProps {
  isExpandable: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}

function ExpandButton({
  isExpandable,
  isExpanded,
  onToggle,
}: Readonly<ExpandButtonProps>) {
  if (!isExpandable) {
    return <span className="size-6 shrink-0" aria-hidden />;
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-6 shrink-0"
      aria-label={isExpanded ? "Collapse subject" : "Expand subject"}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
    >
      {isExpanded ? (
        <ChevronDown className="size-4" />
      ) : (
        <ChevronRight className="size-4" />
      )}
    </Button>
  );
}

interface DueReviewBadgeProps {
  subjectId: string;
  dueCount: number;
}

/**
 * Sidebar review indicator. Hidden when nothing is due; clicking jumps straight
 * into a review session scoped to this subject and its descendants.
 */
function DueReviewBadge({
  subjectId,
  dueCount,
}: Readonly<DueReviewBadgeProps>) {
  if (dueCount <= 0) {
    return null;
  }

  return (
    <Link
      href={getFlashcardReviewSessionHref(subjectId)}
      onClick={(event) => event.stopPropagation()}
      aria-label={`Review ${dueCount} due ${dueCount === 1 ? "card" : "cards"} in this subject`}
      className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium tabular-nums text-foreground transition-colors hover:bg-primary/20"
    >
      {dueCount}
    </Link>
  );
}
