"use client";

import { useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Archive,
  ArchiveRestore,
  BookOpen,
  Lock,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { KeyboardEvent, ReactNode } from "react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { getAllSubjects, restoreSubject } from "@/app/actions/subjects";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { ManagerDataTable } from "@/components/shared/manager-data-table";
import { StatusToneBadge } from "@/components/shared/status-tone-badge";
import { SubjectText } from "@/components/shared/subject-text";
import { TableHeaderLabel } from "@/components/shared/table-header-label";
import { BulkArchiveSubjectsDialog } from "@/components/subjects/bulk-archive-subjects-dialog";
import { BulkDeleteSubjectsDialog } from "@/components/subjects/bulk-delete-subjects-dialog";
import { BulkRestoreSubjectsDialog } from "@/components/subjects/bulk-restore-subjects-dialog";
import { CreateSubjectDialog } from "@/components/subjects/create-subject-dialog";
import { DeleteSubjectDialog } from "@/components/subjects/delete-subject-dialog";
import { EditSubjectDialog } from "@/components/subjects/edit-subject-dialog";
import { SubjectsTableSkeleton } from "@/components/subjects/subjects-table-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getTotalSubjectCount } from "@/features/subjects/subjects-count";
import { LIMITS } from "@/lib/config/limits";
import { formatDateShort, formatIsoDate } from "@/lib/dates/format";
import { PAGE_SIZE_OPTIONS } from "@/lib/pagination/page-size";
import type { SubjectEditDto, SubjectEntity } from "@/lib/server/api-contracts";
import { t } from "@/lib/server/server-action-errors";
import { getStatusToneClasses } from "@/lib/ui/status-tones";
import { cn } from "@/lib/utils";

type SubjectsStatusFilter = "active" | "archived" | "all";
type SubjectsSort = "updatedDesc" | "createdDesc" | "nameAsc";

interface SubjectsListProps {
  subjects: SubjectEntity[];
  initialStatus: SubjectsStatusFilter;
}

type SubjectActionTarget =
  | { action: "edit"; subject: SubjectEditDto }
  | { action: "archive"; subject: { id: string; name: string } }
  | { action: "delete"; subject: { id: string; name: string } };

type SubjectBulkAction = "archive" | "restore" | "delete";

interface SubjectsTableActionsProps {
  subject: SubjectEntity;
  onArchived: (subject: SubjectEntity) => void;
  onDeleted: (subject: SubjectEntity) => void;
  onEdit: (subject: SubjectEntity) => void;
  onRestored: () => void;
}

interface SubjectsSelectionToolbarProps {
  total: number;
  selectedCount: number;
  canArchive: boolean;
  canRestore: boolean;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
  onClearSelection: () => void;
}

interface SubjectsToolbarIconActionProps {
  ariaLabel: string;
  className: string;
  icon: ReactNode;
  onClick: () => void;
}

function isArchived(subject: SubjectEntity): boolean {
  return subject.archivedAt !== null;
}

function getVisibleSubjects(
  subjects: SubjectEntity[],
  status: SubjectsStatusFilter,
  searchQuery: string,
  sortBy: SubjectsSort,
): SubjectEntity[] {
  const normalizedSearch = searchQuery.trim().toLowerCase();

  return [...subjects]
    .filter((subject) => matchesStatus(subject, status))
    .filter((subject) => matchesSearch(subject, normalizedSearch))
    .sort((left, right) => compareSubjects(left, right, sortBy));
}

function matchesStatus(
  subject: SubjectEntity,
  status: SubjectsStatusFilter,
): boolean {
  if (status === "all") return true;
  if (status === "archived") return isArchived(subject);
  return !isArchived(subject);
}

function matchesSearch(subject: SubjectEntity, searchQuery: string): boolean {
  if (!searchQuery) return true;

  return subject.name.toLowerCase().includes(searchQuery);
}

function compareSubjects(
  left: SubjectEntity,
  right: SubjectEntity,
  sortBy: SubjectsSort,
): number {
  if (sortBy === "nameAsc") return left.name.localeCompare(right.name);
  if (sortBy === "createdDesc") {
    return right.createdAt.getTime() - left.createdAt.getTime();
  }

  return right.updatedAt.getTime() - left.updatedAt.getTime();
}

function getPreviewText(value: string, maxLength = 15) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trimEnd()}...`;
}

function getColumnClassName(columnId: string): string {
  switch (columnId) {
    case "select":
      return "w-9 min-w-9";
    case "subject":
      return "min-w-[7rem] sm:min-w-[8rem] lg:min-w-[3rem] lg:max-w-[8rem]";
    case "status":
      return "min-w-[5rem]";
    case "createdAt":
      return "min-w-[5.5rem]";
    case "actions":
      return "w-14 min-w-14";
    default:
      return "";
  }
}

function getSelectedSubjects(
  subjects: SubjectEntity[],
  selectedSubjectIds: string[],
): SubjectEntity[] {
  const selectedIds = new Set(selectedSubjectIds);

  return subjects.filter((subject) => selectedIds.has(subject.id));
}

function getSubjectPageItems(
  subjects: SubjectEntity[],
  pageIndex: number,
  pageSize: number,
): SubjectEntity[] {
  const startIndex = pageIndex * pageSize;

  return subjects.slice(startIndex, startIndex + pageSize);
}

function SubjectsToolbarIconAction({
  ariaLabel,
  className,
  icon,
  onClick,
}: Readonly<SubjectsToolbarIconActionProps>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClick}
          className={className}
          aria-label={ariaLabel}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{ariaLabel}</TooltipContent>
    </Tooltip>
  );
}

function SubjectsSelectionToolbar({
  total,
  selectedCount,
  canArchive,
  canRestore,
  onArchive,
  onRestore,
  onDelete,
  onClearSelection,
}: Readonly<SubjectsSelectionToolbarProps>) {
  const hasSelection = selectedCount > 0;

  return (
    <div className="flex min-h-8 flex-wrap items-center gap-2 sm:justify-between">
      <Badge
        variant="outline"
        className={cn(
          "rounded-full border-border/70 bg-background/70 px-2.5 py-0.5 text-[11px]",
          hasSelection ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {hasSelection ? null : <Search className="size-3.5" />}
        {hasSelection
          ? selectedCount === 1
            ? "1 selected"
            : `${selectedCount} selected`
          : `${total} subjects`}
      </Badge>
      <div
        className={cn(
          "ml-auto flex min-h-8 items-center justify-end gap-2 sm:min-w-34",
          hasSelection
            ? "visible opacity-100"
            : "pointer-events-none invisible opacity-0",
        )}
      >
        {canArchive ? (
          <SubjectsToolbarIconAction
            ariaLabel="Archive"
            onClick={onArchive}
            className="rounded-md text-muted-foreground hover:text-foreground"
            icon={<Archive className="size-4" />}
          />
        ) : null}
        {canRestore ? (
          <SubjectsToolbarIconAction
            ariaLabel="Restore"
            onClick={onRestore}
            className="rounded-md text-muted-foreground hover:text-foreground"
            icon={<ArchiveRestore className="size-4" />}
          />
        ) : null}
        <SubjectsToolbarIconAction
          ariaLabel="Delete"
          onClick={onDelete}
          className="rounded-md text-destructive hover:bg-destructive/10 hover:text-destructive"
          icon={<Trash2 className="size-4" />}
        />
        <div className="hidden h-5 w-px bg-border/60 sm:block" />
        <SubjectsToolbarIconAction
          ariaLabel="Clear selection"
          onClick={onClearSelection}
          className="rounded-md text-muted-foreground hover:text-foreground"
          icon={<X className="size-4" />}
        />
      </div>
    </div>
  );
}

function renderSubjectLabel(subject: SubjectEntity) {
  const content = (
    <>
      <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary shadow-xs">
        <BookOpen className="size-4" />
      </div>
      <div className="min-w-0 max-w-full flex-1 overflow-hidden">
        <SubjectText
          value={getPreviewText(subject.name)}
          mode="truncate"
          className="block max-w-full text-sm font-semibold leading-5.5 text-foreground/95"
          title={subject.name}
        />
      </div>
    </>
  );

  if (isArchived(subject)) {
    return (
      <div className="flex min-w-0 items-center gap-2.5 py-1">{content}</div>
    );
  }

  return (
    <Link
      href={`/subjects/${subject.id}`}
      aria-label={`Open ${subject.name}`}
      className="flex min-w-0 max-w-full items-center gap-2.5 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {content}
    </Link>
  );
}

function getColumns({
  onArchived,
  onDeleted,
  onEdit,
  onRestored,
}: Omit<SubjectsTableActionsProps, "subject">): ColumnDef<SubjectEntity>[] {
  return [
    {
      id: "subject",
      header: () => <TableHeaderLabel>Subject</TableHeaderLabel>,
      cell: ({ row }) => renderSubjectLabel(row.original),
    },
    {
      id: "status",
      header: () => <TableHeaderLabel>Status</TableHeaderLabel>,
      cell: ({ row }) =>
        isArchived(row.original) ? (
          <StatusToneBadge tone="neutral">Archived</StatusToneBadge>
        ) : (
          <StatusToneBadge tone="success">Active</StatusToneBadge>
        ),
    },
    {
      accessorKey: "createdAt",
      header: () => <TableHeaderLabel>Created</TableHeaderLabel>,
      cell: ({ row }) => (
        <span className="text-sm whitespace-nowrap text-muted-foreground">
          {formatDateShort(formatIsoDate(row.original.createdAt))}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <div className="flex w-14 min-w-14 justify-start" />,
      cell: ({ row }) => (
        <div className="flex w-14 min-w-14 items-center justify-start pl-1">
          <SubjectsTableActions
            subject={row.original}
            onArchived={onArchived}
            onDeleted={onDeleted}
            onEdit={onEdit}
            onRestored={onRestored}
          />
        </div>
      ),
      enableHiding: false,
    },
  ];
}

function SubjectsTableActions({
  subject,
  onArchived,
  onDeleted,
  onEdit,
  onRestored,
}: Readonly<SubjectsTableActionsProps>) {
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    event.stopPropagation();
  }

  function handleMenuSelect(
    event: Event,
    action: (subject: SubjectEntity) => void,
  ) {
    event.stopPropagation();
    action(subject);
  }

  function handleRestore() {
    startTransition(async () => {
      const result = await restoreSubject({ id: subject.id });

      if (result.success) {
        await queryClient.invalidateQueries({ queryKey: ["search-data"] });
        onRestored();
        return;
      }

      toast.error(t(result.errorCode, result.errorParams));
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-9 rounded-full border border-transparent bg-background/70 text-muted-foreground/75 shadow-xs transition-all hover:border-border/70 hover:bg-background hover:text-foreground"
          aria-label="Open subject actions"
          disabled={isPending}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={handleTriggerKeyDown}
        >
          <AsyncButtonContent
            pending={isPending}
            idleLabel=""
            pendingLabel=""
            idleIcon={<MoreVertical className="size-3.5" />}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {isArchived(subject) ? (
          <DropdownMenuItem
            onSelect={(event) => {
              event.stopPropagation();
              handleRestore();
            }}
            className="cursor-pointer"
          >
            <ArchiveRestore className="size-4" />
            Restore
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem
              onSelect={(event) => handleMenuSelect(event, onEdit)}
              className="cursor-pointer"
            >
              <Pencil className="size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(event) => handleMenuSelect(event, onArchived)}
              className="cursor-pointer"
            >
              <Archive className="size-4" />
              Archive
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuItem
          onSelect={(event) => handleMenuSelect(event, onDeleted)}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <Trash2 className="size-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SubjectsList({
  subjects,
  initialStatus,
}: Readonly<SubjectsListProps>) {
  const router = useRouter();
  const [subjectItems, setSubjectItems] = useState(subjects);
  const [status, setStatus] = useState<SubjectsStatusFilter>(initialStatus);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SubjectsSort>("updatedDesc");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<SubjectBulkAction | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<SubjectActionTarget | null>(
    null,
  );
  const warningTone = getStatusToneClasses("warning");
  const activeCount = subjectItems.filter(
    (subject) => !isArchived(subject),
  ).length;
  const archivedCount = subjectItems.length - activeCount;
  const visibleSubjects = getVisibleSubjects(
    subjectItems,
    status,
    searchQuery,
    sortBy,
  );
  const pageCount = Math.max(1, Math.ceil(visibleSubjects.length / pageSize));
  const pageSubjects = getSubjectPageItems(
    visibleSubjects,
    pageIndex,
    pageSize,
  );
  const selectedSubjects = getSelectedSubjects(
    visibleSubjects,
    selectedSubjectIds,
  );
  const selectedActiveSubjectIds = selectedSubjects
    .filter((subject) => !isArchived(subject))
    .map((subject) => subject.id);
  const selectedArchivedSubjectIds = selectedSubjects
    .filter(isArchived)
    .map((subject) => subject.id);
  const totalSubjects = getTotalSubjectCount(activeCount, archivedCount);
  const isAtLimit = totalSubjects >= LIMITS.maxSubjects;

  useEffect(() => {
    setSubjectItems(subjects);
  }, [subjects]);

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  useEffect(() => {
    setPageIndex((currentPageIndex) =>
      Math.min(currentPageIndex, pageCount - 1),
    );
  }, [pageCount]);

  useEffect(() => {
    const visibleSubjectIds = new Set(
      visibleSubjects.map((subject) => subject.id),
    );

    setSelectedSubjectIds((currentIds) => {
      const nextIds = currentIds.filter((id) => visibleSubjectIds.has(id));

      return nextIds.length === currentIds.length ? currentIds : nextIds;
    });
  }, [visibleSubjects]);

  async function refreshSubjectsList() {
    const latestSubjects = await getAllSubjects();
    setSubjectItems(latestSubjects);
  }

  function handleStatusChange(value: string) {
    const nextStatus = value as SubjectsStatusFilter;
    setStatus(nextStatus);
    setPageIndex(0);
    router.replace(getSubjectsHref(nextStatus));
  }

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    setPageIndex(0);
  }

  function handlePageSizeChange(nextPageSize: number) {
    setPageSize(nextPageSize);
    setPageIndex(0);
  }

  function handleBulkSuccess(ids: string[]) {
    setSelectedSubjectIds((currentIds) =>
      currentIds.filter((id) => !ids.includes(id)),
    );
    void refreshSubjectsList();
    setBulkAction(null);
  }

  const columns = getColumns({
    onArchived: (subject) =>
      setActiveAction({
        action: "archive",
        subject: { id: subject.id, name: subject.name },
      }),
    onDeleted: (subject) =>
      setActiveAction({
        action: "delete",
        subject: { id: subject.id, name: subject.name },
      }),
    onEdit: (subject) =>
      setActiveAction({
        action: "edit",
        subject: {
          id: subject.id,
          name: subject.name,
        },
      }),
    onRestored: () => {
      void refreshSubjectsList();
    },
  });
  const createButton = (
    <Button
      className="h-10 gap-1.5"
      id="btn-create-subject"
      disabled={isAtLimit}
    >
      <Plus className="size-4" />
      New Subject
    </Button>
  );

  return (
    <TooltipProvider>
      <div className="flex min-w-0 flex-col gap-3 lg:h-full lg:min-h-0">
        <Card className="relative overflow-hidden border-border/70 bg-linear-to-br from-card via-card to-primary/5 py-0 shadow-none">
          <CardContent className="relative px-4 py-3 sm:px-5 sm:py-4">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 flex-1 lg:max-w-3xl">
                  <div className="relative min-w-0">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(event) =>
                        handleSearchChange(event.target.value)
                      }
                      placeholder="Search subjects..."
                      className="h-10 rounded-lg border-border/70 bg-background/80 pl-10 shadow-xs"
                    />
                  </div>
                </div>
                <CreateSubjectDialog
                  trigger={
                    isAtLimit ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className="inline-flex"
                            data-testid="new-subject-disabled-trigger"
                          >
                            {createButton}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          Archive or delete a subject to create another one.
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      createButton
                    )
                  }
                  open={createOpen}
                  onOpenChange={setCreateOpen}
                  onCreated={() => {
                    void refreshSubjectsList();
                  }}
                />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Tabs value={status} onValueChange={handleStatusChange}>
                  <TabsList className="w-full sm:w-auto">
                    <TabsTrigger value="active">
                      Active
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
                        {activeCount}
                      </span>
                    </TabsTrigger>
                    <TabsTrigger value="archived">
                      Archived
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
                        {archivedCount}
                      </span>
                    </TabsTrigger>
                    <TabsTrigger value="all">
                      All
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
                        {totalSubjects}
                      </span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <Select
                  value={sortBy}
                  onValueChange={(value) => {
                    setSortBy(value as SubjectsSort);
                    setPageIndex(0);
                  }}
                >
                  <SelectTrigger className="h-10 w-full rounded-lg border-border/70 bg-background/80 px-3.5 shadow-xs sm:w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value="updatedDesc">
                      Recently Updated
                    </SelectItem>
                    <SelectItem value="createdDesc">Newest Created</SelectItem>
                    <SelectItem value="nameAsc">Name A-Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <SubjectsSelectionToolbar
                total={visibleSubjects.length}
                selectedCount={selectedSubjectIds.length}
                canArchive={selectedActiveSubjectIds.length > 0}
                canRestore={selectedArchivedSubjectIds.length > 0}
                onArchive={() => setBulkAction("archive")}
                onRestore={() => setBulkAction("restore")}
                onDelete={() => setBulkAction("delete")}
                onClearSelection={() => setSelectedSubjectIds([])}
              />
            </div>
          </CardContent>
        </Card>

        {isAtLimit ? (
          <div
            className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm shadow-xs ${warningTone.border} ${warningTone.bg}`}
          >
            <Lock className={`size-4 shrink-0 ${warningTone.text}`} />
            <p className={warningTone.text}>
              {`You've reached the system limit of ${LIMITS.maxSubjects} subjects. Please archive or delete subjects to create more.`}
            </p>
          </div>
        ) : null}

        {subjectItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 px-6 py-20 text-center lg:min-h-0 lg:flex-1">
            <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <BookOpen className="size-6" />
            </div>
            <h2 className="mb-1 text-lg font-semibold">No subjects yet</h2>
            <p className="mb-6 max-w-sm text-center text-sm text-muted-foreground">
              Create your first subject to start organizing your notes and
              tracking your academic progress.
            </p>
            <Button className="gap-1.5" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Create Subject
            </Button>
          </div>
        ) : (
          <Card className="min-w-0 overflow-hidden border-border/70 bg-card/85 py-0 shadow-none lg:min-h-0 lg:flex-1">
            <ManagerDataTable
              data={pageSubjects}
              columns={columns}
              emptyLabel="No subjects match your filters."
              getRowId={(subject) => subject.id}
              getRowAriaLabel={(subject) => `Open ${subject.name}`}
              getRowClassName={(subject) =>
                isArchived(subject) ? "text-muted-foreground" : ""
              }
              onRowClick={(subject) => {
                if (!isArchived(subject)) {
                  router.push(`/subjects/${subject.id}`);
                }
              }}
              exposeRowNavigationRole={false}
              onPageIndexChange={setPageIndex}
              onPageSizeChange={handlePageSizeChange}
              pageIndex={pageIndex}
              pageCount={pageCount}
              pageSize={pageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              pageSizeLabel="Rows"
              pageLabel={(current, total) => `Page ${current} of ${total}`}
              prevLabel="Previous"
              nextLabel="Next"
              loadingSkeleton={
                <SubjectsTableSkeleton
                  selectedRow={selectedSubjectIds.length > 0}
                />
              }
              selectedRowIds={selectedSubjectIds}
              onSelectedRowIdsChange={setSelectedSubjectIds}
              selectionAriaLabel="Select subject"
              tableClassName="w-full min-w-[30rem] sm:min-w-[34rem] lg:min-w-[20rem]"
              columnResizeMode="onEnd"
              scrollAreaClassName="min-w-0 overflow-x-auto overflow-y-auto"
              getHeaderCellClassName={getColumnClassName}
              getBodyCellClassName={(columnId) =>
                cn("px-3 py-3 align-middle", getColumnClassName(columnId))
              }
              wrapperClassName="min-w-0"
            />
          </Card>
        )}

        {activeAction?.action === "edit" ? (
          <EditSubjectDialog
            subject={activeAction.subject}
            open
            onSaved={(updatedSubject) => {
              setSubjectItems((currentSubjects) =>
                currentSubjects.map((currentSubject) =>
                  currentSubject.id === updatedSubject.id
                    ? {
                        ...currentSubject,
                        name: updatedSubject.name,
                      }
                    : currentSubject,
                ),
              );
            }}
            onOpenChange={(open) => {
              if (!open) setActiveAction(null);
            }}
          />
        ) : null}
        {activeAction?.action === "archive" ? (
          <DeleteSubjectDialog
            subjectId={activeAction.subject.id}
            subjectName={activeAction.subject.name}
            open
            onOpenChange={(open) => {
              if (!open) setActiveAction(null);
            }}
            mode="archive"
            onSuccess={() => {
              void refreshSubjectsList();
              setActiveAction(null);
            }}
          />
        ) : null}
        {activeAction?.action === "delete" ? (
          <DeleteSubjectDialog
            subjectId={activeAction.subject.id}
            subjectName={activeAction.subject.name}
            open
            onOpenChange={(open) => {
              if (!open) setActiveAction(null);
            }}
            mode="delete"
            onSuccess={() => {
              void refreshSubjectsList();
              setActiveAction(null);
            }}
          />
        ) : null}
        <BulkArchiveSubjectsDialog
          ids={selectedActiveSubjectIds}
          open={bulkAction === "archive"}
          onOpenChange={(open) => {
            if (!open) setBulkAction(null);
          }}
          onArchived={handleBulkSuccess}
        />
        <BulkRestoreSubjectsDialog
          ids={selectedArchivedSubjectIds}
          open={bulkAction === "restore"}
          onOpenChange={(open) => {
            if (!open) setBulkAction(null);
          }}
          onRestored={handleBulkSuccess}
        />
        <BulkDeleteSubjectsDialog
          ids={selectedSubjectIds}
          open={bulkAction === "delete"}
          onOpenChange={(open) => {
            if (!open) setBulkAction(null);
          }}
          onDeleted={handleBulkSuccess}
        />
      </div>
    </TooltipProvider>
  );
}

function getSubjectsHref(status: SubjectsStatusFilter): string {
  if (status === "active") {
    return "/subjects";
  }

  return `/subjects?status=${status}`;
}
