"use client";

import { BookOpen, Lock, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSubjectListItems } from "@/app/actions/subjects";
import { EmptyState } from "@/components/shared/empty-state";
import { ManagerDataTable } from "@/components/shared/manager-data-table";
import { BulkDeleteSubjectsDialog } from "@/components/subjects/bulk-delete-subjects-dialog";
import { CreateSubjectDialog } from "@/components/subjects/create-subject-dialog";
import { DeleteSubjectDialog } from "@/components/subjects/delete-subject-dialog";
import { EditSubjectDialog } from "@/components/subjects/edit-subject-dialog";
import {
  getColumnClassName,
  getSelectedSubjects,
  getSubjectPageItems,
  getVisibleSubjects,
  type SubjectsSort,
} from "@/components/subjects/subjects-list-utils";
import { SubjectsSelectionToolbar } from "@/components/subjects/subjects-selection-toolbar";
import { getSubjectColumns } from "@/components/subjects/subjects-table-columns";
import { SubjectsTableSkeleton } from "@/components/subjects/subjects-table-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LIMITS } from "@/lib/config/limits";
import { PAGE_SIZE_OPTIONS } from "@/lib/pagination/page-size";
import type {
  SubjectEditDto,
  SubjectListItem,
} from "@/lib/server/api-contracts";
import { getStatusToneClasses } from "@/lib/ui/status-tones";

interface SubjectsListProps {
  subjects: SubjectListItem[];
}

type SubjectActionTarget =
  | { action: "edit"; subject: SubjectEditDto }
  | { action: "delete"; subject: { id: string; name: string } };

type SubjectBulkAction = "delete";

export function SubjectsList({ subjects }: Readonly<SubjectsListProps>) {
  const router = useRouter();
  const [subjectItems, setSubjectItems] = useState(subjects);
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
  const totalSubjects = subjectItems.length;
  const visibleSubjects = getVisibleSubjects(subjectItems, searchQuery, sortBy);
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
  const selectedSubjectIdsForBulk = selectedSubjects.map(
    (subject) => subject.id,
  );
  const isAtLimit = totalSubjects >= LIMITS.maxSubjects;

  useEffect(() => {
    setSubjectItems(subjects);
  }, [subjects]);

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
    const latestSubjects = await getSubjectListItems();
    setSubjectItems(latestSubjects);
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

  const columns = getSubjectColumns({
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
          kind: subject.kind,
        },
      }),
    hasSelection: selectedSubjectIds.length > 0,
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
                          Delete a subject to create another one.
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
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {totalSubjects} subject{totalSubjects !== 1 ? "s" : ""}
                </span>
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
                    <SelectItem value="nameAsc">Name A-Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <SubjectsSelectionToolbar
                total={visibleSubjects.length}
                selectedCount={selectedSubjectIds.length}
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
              {`You've reached the system limit of ${LIMITS.maxSubjects} subjects. Please delete subjects to create more.`}
            </p>
          </div>
        ) : null}

        {subjectItems.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No subjects yet"
            description="Create your first subject to start organizing your notes and tracking your academic progress."
            className="lg:min-h-0 lg:flex-1"
            action={
              <Button className="gap-1.5" onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" />
                Create Subject
              </Button>
            }
          />
        ) : (
          <Card className="h-[clamp(22rem,58svh,36rem)] min-w-0 overflow-hidden border-border/70 bg-card/85 py-0 shadow-none lg:h-auto lg:min-h-0 lg:flex-1">
            <ManagerDataTable
              data={pageSubjects}
              columns={columns}
              emptyLabel="No subjects match your filters."
              getRowId={(subject) => subject.id}
              getRowAriaLabel={(subject) => `Open ${subject.name}`}
              onRowClick={(subject) => {
                router.push(`/subjects/${subject.id}`);
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
              tableClassName="w-full min-w-0 sm:min-w-[28rem] lg:min-w-[20rem]"
              columnResizeMode="onEnd"
              scrollAreaClassName="min-w-0 overflow-x-auto overflow-y-auto"
              getHeaderCellClassName={getColumnClassName}
              getBodyCellClassName={getColumnClassName}
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
        {activeAction?.action === "delete" ? (
          <DeleteSubjectDialog
            subjectId={activeAction.subject.id}
            subjectName={activeAction.subject.name}
            open
            onOpenChange={(open) => {
              if (!open) setActiveAction(null);
            }}
            onSuccess={() => {
              void refreshSubjectsList();
              setActiveAction(null);
            }}
          />
        ) : null}
        <BulkDeleteSubjectsDialog
          ids={selectedSubjectIdsForBulk}
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
