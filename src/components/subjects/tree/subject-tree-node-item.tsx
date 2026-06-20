"use client";

import {
  ChevronDown,
  ChevronRight,
  FileText,
  FolderPlus,
  GraduationCap,
  Layers,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import type { DragEvent } from "react";
import {
  type DocumentRowActionHandlers,
  DocumentRowMenu,
} from "@/components/documents/document-row-menu";
import type {
  SubjectDeleteTarget,
  SubjectDocumentsState,
  SubjectEditTarget,
} from "@/components/subjects/tree/subject-tree-types";
import type { DraggedDocument } from "@/components/subjects/tree/use-subject-drag-and-drop";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DocumentListItem } from "@/features/documents/types";
import { isAcademicSubject } from "@/features/subjects/constants";
import {
  getDocumentDetailHref,
  getFlashcardsHref,
} from "@/lib/navigation/detail-page-back-link";
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
  onCreateNote: (subjectId: string) => void;
  onCreateMindmap: (subjectId: string) => void;
  onEdit: (subject: SubjectEditTarget) => void;
  onDelete: (subject: SubjectDeleteTarget) => void;
  onDragStart: (subjectId: string) => void;
  onDocumentDragStart: (document: DraggedDocument) => void;
  onDragTarget: (targetId: string) => void;
  onDropTarget: (targetId: string) => void;
  onDragEnd: () => void;
}

/** Indentation per nesting level, in rem, applied to a node's content row. */
const INDENT_REM = 0.75;

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
    onCreateNote,
    onCreateMindmap,
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
          onCreateNote={onCreateNote}
          onCreateMindmap={onCreateMindmap}
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

  const content = (
    <>
      {isMoving ? (
        <Loader2
          className="size-3.5 shrink-0 animate-spin text-muted-foreground"
          aria-hidden
        />
      ) : null}
      <span className="min-w-0 truncate font-medium" title={node.path}>
        {node.name}
      </span>
    </>
  );

  // Academic subjects own a page (attendance/assessments), so their label is a
  // navigable link. General subjects have no page — they are pure containers
  // managed in this tree — so their label is inert text (expand via the
  // chevron) and never shows the pointer cursor that would imply navigation.
  if (isAcademicSubject(node.kind)) {
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

function DocumentRows({
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
        const Icon = document.kind === "mindmap" ? Workflow : FileText;
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

interface SubjectActionsMenuProps {
  node: SubjectTreeNode;
  onCreateChild: (parentSubjectId: string) => void;
  onCreateNote: (subjectId: string) => void;
  onCreateMindmap: (subjectId: string) => void;
  onEdit: (subject: SubjectEditTarget) => void;
  onDelete: (subject: SubjectDeleteTarget) => void;
}

function SubjectActionsMenu({
  node,
  onCreateChild,
  onCreateNote,
  onCreateMindmap,
  onEdit,
  onDelete,
}: Readonly<SubjectActionsMenuProps>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
          aria-label={`Actions for ${node.name}`}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Plus className="size-4" />
            New
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => onCreateChild(node.id)}>
              <FolderPlus className="size-4" />
              Subfolder
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCreateNote(node.id)}>
              <FileText className="size-4" />
              Note
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCreateMindmap(node.id)}>
              <Workflow className="size-4" />
              Mindmap
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem asChild>
          <Link href={getFlashcardsHref("review", node.id, { focus: true })}>
            <GraduationCap className="size-4" />
            Review flashcards
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={getFlashcardsHref("manage", node.id)}>
            <Layers className="size-4" />
            Manage flashcards
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() =>
            onEdit({ id: node.id, name: node.name, kind: node.kind })
          }
        >
          <Pencil className="size-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => onDelete({ id: node.id, name: node.path })}
        >
          <Trash2 className="size-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
