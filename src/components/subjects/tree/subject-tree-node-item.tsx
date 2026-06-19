"use client";

import {
  ChevronDown,
  ChevronRight,
  FileText,
  FolderPlus,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
  Workflow,
} from "lucide-react";
import Link from "next/link";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DocumentListItem } from "@/features/documents/types";
import { getDocumentDetailHref } from "@/lib/navigation/detail-page-back-link";
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
        <Link
          href={`/subjects/${node.id}`}
          draggable
          onDragStart={(event) => {
            event.stopPropagation();
            onDragStart(node.id);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            onDragTarget(node.id);
          }}
          onDrop={(event) => {
            event.preventDefault();
            onDropTarget(node.id);
          }}
          onDragEnd={onDragEnd}
          aria-current={isSelected ? "page" : undefined}
          className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-sm focus-visible:outline-none"
        >
          {isMoving ? (
            <Loader2
              className="size-3.5 shrink-0 animate-spin text-muted-foreground"
              aria-hidden
            />
          ) : null}
          <span className="min-w-0 truncate font-medium" title={node.path}>
            {node.name}
          </span>
        </Link>
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
        <DropdownMenuItem onClick={() => onCreateChild(node.id)}>
          <FolderPlus className="size-4" />
          New subfolder
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onCreateNote(node.id)}>
          <FileText className="size-4" />
          New note
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onCreateMindmap(node.id)}>
          <Workflow className="size-4" />
          New mindmap
        </DropdownMenuItem>
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
