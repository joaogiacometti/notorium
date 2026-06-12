"use client";

import { SubjectText } from "@/components/shared/subject-text";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  SortBy,
  StatusFilter,
  TypeFilter,
} from "@/features/assessments/assessment-filters";
import {
  assessmentTypeValues,
  getAssessmentTypeLabel,
} from "@/features/assessments/constants";
import type { SubjectEntity } from "@/lib/server/api-contracts";

interface PlanningAssessmentsFiltersProps {
  subjects: SubjectEntity[];
  subjectFilter: string;
  statusFilter: StatusFilter;
  typeFilter: TypeFilter;
  sortBy: SortBy;
  disabled: boolean;
  onSubjectFilterChange: (value: string) => void;
  onStatusFilterChange: (value: StatusFilter) => void;
  onTypeFilterChange: (value: TypeFilter) => void;
  onSortChange: (value: SortBy) => void;
}

const filterTriggerClassName =
  "h-10 w-full min-w-0 rounded-lg border-border/70 bg-background/80 px-3 shadow-xs sm:px-3.5";

export function PlanningAssessmentsFilters({
  subjects,
  subjectFilter,
  statusFilter,
  typeFilter,
  sortBy,
  disabled,
  onSubjectFilterChange,
  onStatusFilterChange,
  onTypeFilterChange,
  onSortChange,
}: Readonly<PlanningAssessmentsFiltersProps>) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
      <div className="min-w-0">
        <Select
          value={subjectFilter}
          onValueChange={onSubjectFilterChange}
          disabled={disabled}
        >
          <SelectTrigger className={filterTriggerClassName}>
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
          disabled={disabled}
          onValueChange={(value) => onStatusFilterChange(value as StatusFilter)}
        >
          <SelectTrigger className={filterTriggerClassName}>
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
          disabled={disabled}
          onValueChange={(value) => onTypeFilterChange(value as TypeFilter)}
        >
          <SelectTrigger className={filterTriggerClassName}>
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
          disabled={disabled}
          onValueChange={(value) => onSortChange(value as SortBy)}
        >
          <SelectTrigger className={filterTriggerClassName}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectItem value="smart">Smart</SelectItem>
            <SelectItem value="dueDateAsc">Due Date Asc</SelectItem>
            <SelectItem value="dueDateDesc">Due Date Desc</SelectItem>
            <SelectItem value="updatedAtDesc">Recently Updated</SelectItem>
            <SelectItem value="scoreDesc">Score Desc</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
