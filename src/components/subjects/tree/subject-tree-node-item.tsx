"use client";

import {
  ChevronDown,
  ChevronRight,
  Folder,
  GraduationCap,
  Loader2,
} from "lucide-react";
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
import { isAcademicSubject } from "@/features/subjects/constants";
import { getFlashcardsHref } from "@/lib/navigation/detail-page-back-link";
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
  onCreateChild: (parentSubjectId: string) => void;
  onCreateAssessment: (subjectId: string) => void;
  onRecordMiss: (subjectId: string) => void;
  onCreateNote: (subjectId: string) => void;
  onCreateMindmap: (subjectId: string) => void;
  onCreateBook: (subjectId: string) => void;
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
    onCreateChild,
    onCreateAssessment,
    onRecordMiss,
    onCreateNote,
    onCreateMindmap,
    onCreateBook,
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
        className={cn(
          "group flex items-center gap-1 rounded-md pr-1 transition-colors",
          isSelected
            ? "bg-muted/60 text-foreground"
            : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
          isDragging && "opacity-50",
          isDropTarget && "bg-background ring-1 ring-(--intent-info-border)",
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
          isSelected={isSelected}
          onDragStart={onDragStart}
          onDragTarget={onDragTarget}
          onDropTarget={onDropTarget}
          onDragEnd={onDragEnd}
        />
        <DueReviewBadge subjectId={node.id} dueCount={node.dueFlashcardCount} />
        <SubjectActionsMenu
          node={node}
          onCreateChild={onCreateChild}
          onCreateAssessment={onCreateAssessment}
          onRecordMiss={onRecordMiss}
          onCreateNote={onCreateNote}
          onCreateMindmap={onCreateMindmap}
          onCreateBook={onCreateBook}
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
          />
        </div>
      ) : null}
    </div>
  );
}

interface SubjectNodeLabelProps {
  node: SubjectTreeNode;
  isMoving: boolean;
  isSelected: boolean;
  onDragStart: (subjectId: string) => void;
  onDragTarget: (targetId: string) => void;
  onDropTarget: (targetId: string) => void;
  onDragEnd: () => void;
}

/**
 * The subject label inside a tree row. Academic subjects link to their
 * attendance/assessments page; general subjects have no dedicated page (the
 * sidebar fully manages their contents), so their label is inert text and the
 * chevron is the only expand control.
 */
function SubjectNodeLabel({
  node,
  isMoving,
  isSelected,
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
    className:
      "flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left text-sm focus-visible:outline-none",
  };

  const isAcademic = isAcademicSubject(node.kind);

  // A leading icon makes the kind legible at a glance: a graduation cap marks
  // academic subjects, which open their own dashboard page, while a folder
  // marks general subjects, which are pure containers with nowhere to navigate.
  const KindIcon = isAcademic ? GraduationCap : Folder;

  const content = (
    <>
      {isMoving ? (
        <Loader2
          className="size-3.5 shrink-0 animate-spin text-muted-foreground"
          aria-hidden
        />
      ) : (
        <KindIcon
          className="size-3.5 shrink-0 text-muted-foreground"
          aria-hidden
        />
      )}
      <span
        className={cn(
          "min-w-0 truncate font-medium",
          // Reinforce the link affordance on hover for academic subjects only.
          isAcademic && "group-hover:underline group-hover:underline-offset-2",
        )}
        title={node.path}
      >
        {node.name}
      </span>
    </>
  );

  // Academic subjects own a page (attendance/assessments), so their label is a
  // navigable link. General subjects have no page — they are pure containers
  // managed in this tree — so their label is inert text (expand via the
  // chevron) and never shows the pointer cursor that would imply navigation.
  if (isAcademic) {
    return (
      <Link
        href={`/subjects/${node.id}`}
        aria-current={isSelected ? "page" : undefined}
        {...dragProps}
        className={cn(dragProps.className, "cursor-pointer")}
      >
        {content}
      </Link>
    );
  }

  return (
    <span {...dragProps} className={cn(dragProps.className, "cursor-default")}>
      {content}
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
      href={getFlashcardsHref("review", subjectId, { focus: true })}
      onClick={(event) => event.stopPropagation()}
      aria-label={`Review ${dueCount} due ${dueCount === 1 ? "card" : "cards"} in this subject`}
      className="shrink-0 rounded-full bg-(--intent-info-bg) px-2 py-0.5 text-[10px] font-medium tabular-nums text-(--intent-info-text) transition-colors hover:bg-(--intent-info-bg-hover)"
    >
      {dueCount}
    </Link>
  );
}
