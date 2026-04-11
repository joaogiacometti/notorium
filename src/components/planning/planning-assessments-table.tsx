"use client";

import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Lock, Plus, Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { getPlanningAssessmentsPage } from "@/app/actions/assessments";
import { LazyCreateAssessmentDialog as CreateAssessmentDialog } from "@/components/assessments/lazy-create-assessment-dialog";
import { PlanningAssessmentsManagerTable } from "@/components/planning/planning-assessments-manager-table";
import { SubjectText } from "@/components/shared/subject-text";
import { useManagerPageState } from "@/components/shared/use-manager-page-state";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import type {
  SortBy,
  StatusFilter,
  TypeFilter,
} from "@/features/assessments/assessment-filters";
import {
  assessmentTypeValues,
  getAssessmentTypeLabel,
} from "@/features/assessments/constants";
import { LIMITS } from "@/lib/config/limits";
import type {
  PlanningAssessmentsPage,
  SubjectEntity,
} from "@/lib/server/api-contracts";
import { getStatusToneClasses } from "@/lib/ui/status-tones";

interface PlanningAssessmentsTableProps {
  initialSubjectId?: string;
  initialPageData: PlanningAssessmentsPage;
  subjects: SubjectEntity[];
  subjectNamesById: Record<string, string>;
}

const planningAssessmentsPageSize = 25;

export function PlanningAssessmentsTable({
  initialSubjectId,
  initialPageData,
  subjects,
  subjectNamesById,
}: Readonly<PlanningAssessmentsTableProps>) {
  const warningTone = getStatusToneClasses("warning");
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("smart");
  const {
    filter: subjectFilter,
    pageIndex,
    resolvedSearchQuery,
    searchQuery,
    setFilter: setSubjectFilter,
    setPageIndex,
    setSearchQuery,
  } = useManagerPageState({
    initialFilter: initialSubjectId ?? "all",
    onFilterChange: (nextSubjectFilter) => {
      const query = new URLSearchParams();
      query.set("view", "assessments");

      if (nextSubjectFilter !== "all") {
        query.set("subject", nextSubjectFilter);
      }

      startTransition(() => {
        router.replace(`${pathname}?${query.toString()}`);
      });
    },
  });

  const assessmentsQuery = useQuery({
    queryKey: [
      "planning-assessments-page",
      pageIndex,
      planningAssessmentsPageSize,
      subjectFilter,
      resolvedSearchQuery,
      statusFilter,
      typeFilter,
      sortBy,
    ],
    queryFn: async () => {
      const result = await getPlanningAssessmentsPage({
        pageIndex,
        pageSize: planningAssessmentsPageSize,
        search: resolvedSearchQuery,
        subjectId: subjectFilter === "all" ? undefined : subjectFilter,
        statusFilter,
        typeFilter,
        sortBy,
      });

      if ("errorCode" in result) {
        return {
          items: [],
          total: 0,
          allCount: 0,
          subjectAssessmentCount: null,
          subjectFinalGrade: null,
        } satisfies PlanningAssessmentsPage;
      }

      return result;
    },
    initialData:
      pageIndex === 0 &&
      subjectFilter === (initialSubjectId ?? "all") &&
      resolvedSearchQuery.trim().length === 0 &&
      statusFilter === "all" &&
      typeFilter === "all" &&
      sortBy === "smart"
        ? initialPageData
        : undefined,
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 20,
  });

  const pageData = assessmentsQuery.data ?? initialPageData;
  const assessments = pageData.items;
  const total = pageData.total;
  const hasAnyAssessments = pageData.allCount > 0;
  const selectedSubjectCount = pageData.subjectAssessmentCount ?? 0;
  const isAssessmentsScopeLoading =
    assessmentsQuery.isFetching && assessmentsQuery.isPlaceholderData;
  const isAtSubjectLimit =
    subjectFilter !== "all" &&
    selectedSubjectCount >= LIMITS.maxAssessmentsPerSubject;
  const finalGrade = pageData.subjectFinalGrade;
  const hasSubjects = subjects.length > 0;

  useEffect(() => {
    const pageCount = Math.max(
      1,
      Math.ceil(
        (assessmentsQuery.data?.total ?? initialPageData.total) /
          planningAssessmentsPageSize,
      ),
    );
    const maxIndex = pageCount - 1;

    if (pageIndex > maxIndex) {
      setPageIndex(maxIndex);
    }
  }, [
    assessmentsQuery.data?.total,
    initialPageData.total,
    pageIndex,
    setPageIndex,
  ]);

  function refreshAssessments() {
    setPageIndex(0);
    void assessmentsQuery.refetch();
  }

  return (
    <div className="flex flex-col gap-3 lg:h-full lg:min-h-0">
      <Card className="relative overflow-hidden border-border/70 bg-linear-to-br from-card via-card to-primary/5 py-0 shadow-none">
        <div className="absolute top-0 right-0 size-28 rounded-full bg-primary/10 blur-3xl" />
        <CardContent className="relative px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 flex-1 lg:max-w-3xl">
                <div className="relative min-w-0">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search title or description..."
                    className="h-10 rounded-lg border-border/70 bg-background/80 pl-10 shadow-xs"
                  />
                </div>
              </div>
              <Button
                type="button"
                onClick={() => setCreateOpen(true)}
                disabled={!hasSubjects}
                className="h-10 w-full shrink-0 gap-2 rounded-lg px-4 shadow-sm sm:w-auto"
              >
                <Plus className="size-4" />
                Add Assessment
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="min-w-0">
                <Select
                  value={subjectFilter}
                  onValueChange={setSubjectFilter}
                  disabled={isAssessmentsScopeLoading}
                >
                  <SelectTrigger className="h-10 w-full rounded-lg border-border/70 bg-background/80 px-3.5 shadow-xs">
                    <SelectValue placeholder="Filter by subject" />
                  </SelectTrigger>
                  <SelectContent align="start">
                    <SelectItem value="all">All Subjects</SelectItem>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        <SubjectText
                          value={subject.name}
                          mode="truncate"
                          className="block max-w-full"
                        />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0">
                <Select
                  value={statusFilter}
                  disabled={isAssessmentsScopeLoading}
                  onValueChange={(value) => {
                    setStatusFilter(value as StatusFilter);
                    setPageIndex(0);
                  }}
                >
                  <SelectTrigger className="h-10 w-full rounded-lg border-border/70 bg-background/80 px-3.5 shadow-xs">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent align="start">
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0">
                <Select
                  value={typeFilter}
                  disabled={isAssessmentsScopeLoading}
                  onValueChange={(value) => {
                    setTypeFilter(value as TypeFilter);
                    setPageIndex(0);
                  }}
                >
                  <SelectTrigger className="h-10 w-full rounded-lg border-border/70 bg-background/80 px-3.5 shadow-xs">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent align="start">
                    <SelectItem value="all">All Types</SelectItem>
                    {assessmentTypeValues.map((value) => (
                      <SelectItem key={value} value={value}>
                        {getAssessmentTypeLabel(value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0">
                <Select
                  value={sortBy}
                  disabled={isAssessmentsScopeLoading}
                  onValueChange={(value) => {
                    setSortBy(value as SortBy);
                    setPageIndex(0);
                  }}
                >
                  <SelectTrigger className="h-10 w-full rounded-lg border-border/70 bg-background/80 px-3.5 shadow-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="start">
                    <SelectItem value="smart">Smart</SelectItem>
                    <SelectItem value="dueDateAsc">Due Date Asc</SelectItem>
                    <SelectItem value="dueDateDesc">Due Date Desc</SelectItem>
                    <SelectItem value="updatedAtDesc">
                      Recently Updated
                    </SelectItem>
                    <SelectItem value="scoreDesc">Score Desc</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {isAssessmentsScopeLoading ? (
                <>
                  <Skeleton
                    className="h-6 w-32 rounded-full"
                    data-testid="planning-assessments-count-loading"
                  />
                  {subjectFilter === "all" ? null : (
                    <Skeleton className="h-6 w-44 rounded-full" />
                  )}
                </>
              ) : (
                <>
                  <Badge
                    variant="outline"
                    className="rounded-full border-border/70 bg-background/70 px-2.5 py-0.5 text-[11px] text-muted-foreground"
                  >
                    <Search className="size-3.5" />
                    {total} {total === 1 ? "item" : "items"}
                  </Badge>
                  {subjectFilter === "all" ? null : (
                    <Badge
                      variant="outline"
                      className="rounded-full border-primary/20 bg-primary/8 px-2.5 py-0.5 text-[11px] text-foreground"
                    >
                      <ClipboardList className="size-3.5 text-primary" />
                      {selectedSubjectCount}/{LIMITS.maxAssessmentsPerSubject}{" "}
                      items
                    </Badge>
                  )}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      {isAtSubjectLimit ? (
        <div
          className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm shadow-xs ${warningTone.border} ${warningTone.bg}`}
        >
          <Lock className={`size-4 shrink-0 ${warningTone.text}`} />
          <p className={warningTone.text}>
            You've reached the limit of {LIMITS.maxAssessmentsPerSubject}{" "}
            assessments per subject. Please delete existing ones to add more.
          </p>
        </div>
      ) : null}
      <Card className="overflow-hidden border-border/70 bg-card/85 py-0 shadow-none lg:min-h-0 lg:flex-1">
        {hasAnyAssessments ? (
          <PlanningAssessmentsManagerTable
            assessments={assessments}
            total={total}
            finalGrade={finalGrade}
            isLoading={isAssessmentsScopeLoading}
            pageIndex={pageIndex}
            pageSize={planningAssessmentsPageSize}
            selectedSubjectId={
              subjectFilter === "all" ? undefined : subjectFilter
            }
            subjectNamesById={subjectNamesById}
            onPageIndexChange={setPageIndex}
            onUpdated={refreshAssessments}
            onDeleted={refreshAssessments}
          />
        ) : (
          <CardContent className="flex flex-col items-center justify-center px-6 py-14 text-center sm:px-10">
            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
              <ClipboardList className="size-6" />
            </div>
            <h2 className="text-lg font-semibold tracking-tight">
              No assessments yet
            </h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Assessments you add to your subjects will appear here.
            </p>
            <Button
              type="button"
              onClick={() => setCreateOpen(true)}
              disabled={!hasSubjects}
              className="mt-6 h-10 gap-2 rounded-lg px-4 shadow-sm"
            >
              <Plus className="size-4" />
              Add Assessment
            </Button>
          </CardContent>
        )}
      </Card>
      <CreateAssessmentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={refreshAssessments}
        subjects={subjects}
        subjectId={subjectFilter === "all" ? undefined : subjectFilter}
      />
    </div>
  );
}
