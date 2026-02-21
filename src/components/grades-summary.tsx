"use client";

import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Pencil,
  Plus,
  Trash2,
  Trophy,
} from "lucide-react";
import { useState } from "react";
import { CreateCategoryDialog } from "@/components/create-category-dialog";
import { CreateGradeDialog } from "@/components/create-grade-dialog";
import { DeleteCategoryDialog } from "@/components/delete-category-dialog";
import { DeleteGradeDialog } from "@/components/delete-grade-dialog";
import { EditCategoryDialog } from "@/components/edit-category-dialog";
import { EditGradeDialog } from "@/components/edit-grade-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Grade {
  id: string;
  name: string;
  value: string;
  categoryId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface GradeCategory {
  id: string;
  name: string;
  weight: string | null;
  subjectId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  grades: Grade[];
}

interface GradesSummaryProps {
  subjectId: string;
  categories: GradeCategory[];
}

function getCategoryAverage(grades: Grade[]): number | null {
  if (grades.length === 0) return null;
  const sum = grades.reduce((acc, g) => acc + Number(g.value), 0);
  return sum / grades.length;
}

function computeWeightedAverage(
  categoriesWithGrades: GradeCategory[],
): number | null {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const category of categoriesWithGrades) {
    const avg = getCategoryAverage(category.grades);
    if (avg === null) continue;

    const weight = category.weight === null ? 0 : Number(category.weight);
    if (weight > 0) {
      weightedSum += avg * weight;
      totalWeight += weight;
    }
  }

  if (totalWeight === 0) return null;
  return weightedSum / totalWeight;
}

function computeSimpleAverage(
  categoriesWithGrades: GradeCategory[],
): number | null {
  const allAvgs = categoriesWithGrades
    .map((c) => getCategoryAverage(c.grades))
    .filter((v): v is number => v !== null);

  if (allAvgs.length === 0) return null;
  return allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length;
}

function getOverallAverage(categories: GradeCategory[]): number | null {
  const categoriesWithGrades = categories.filter((c) => c.grades.length > 0);
  if (categoriesWithGrades.length === 0) return null;

  const hasWeights = categoriesWithGrades.some(
    (c) => c.weight !== null && Number(c.weight) > 0,
  );

  if (hasWeights) {
    return computeWeightedAverage(categoriesWithGrades);
  }

  return computeSimpleAverage(categoriesWithGrades);
}

function getGradeColor(value: number): string {
  if (value >= 70) return "text-emerald-500";
  if (value >= 50) return "text-amber-500";
  return "text-red-500";
}

function getGradeBgColor(value: number): string {
  if (value >= 70) return "bg-emerald-500/10 border-emerald-500/20";
  if (value >= 50) return "bg-amber-500/10 border-amber-500/20";
  return "bg-red-500/10 border-red-500/20";
}

function getGradeBarColor(value: number): string {
  if (value >= 70) return "bg-emerald-500";
  if (value >= 50) return "bg-amber-500";
  return "bg-red-500";
}

function pluralGrades(count: number): string {
  return count === 1 ? "grade" : "grades";
}

function pluralCategories(count: number): string {
  return count === 1 ? "category" : "categories";
}

function getPerformanceLabel(average: number): string {
  if (average >= 70) return "Good";
  if (average >= 50) return "Fair";
  return "Needs Work";
}

export function GradesSummary({
  subjectId,
  categories,
}: Readonly<GradesSummaryProps>) {
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [addGradeTarget, setAddGradeTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [editCategoryTarget, setEditCategoryTarget] =
    useState<GradeCategory | null>(null);
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [editGradeTarget, setEditGradeTarget] = useState<Grade | null>(null);
  const [deleteGradeTarget, setDeleteGradeTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set(categories.map((c) => c.id)),
  );

  const overallAvg = getOverallAverage(categories);
  const hasWeights = categories.some(
    (c) => c.weight !== null && Number(c.weight) > 0,
  );
  const totalGrades = categories.reduce((acc, c) => acc + c.grades.length, 0);

  function toggleCategory(id: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const subtitle =
    categories.length === 0
      ? "Add categories to start tracking your grades."
      : `${totalGrades} ${pluralGrades(totalGrades)} across ${categories.length} ${pluralCategories(categories.length)}`;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Grades</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => setCreateCategoryOpen(true)}
          id="btn-add-category"
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">Add Category</span>
        </Button>
      </div>

      {categories.length > 0 ? (
        <div className="space-y-6">
          {/* Overall Average Card */}
          {overallAvg !== null && (
            <OverallAverageCard
              average={overallAvg}
              hasWeights={hasWeights}
              totalGrades={totalGrades}
              totalCategories={categories.length}
            />
          )}

          {/* Category List */}
          <div className="space-y-3">
            {categories.map((category) => {
              const catAvg = getCategoryAverage(category.grades);
              const isExpanded = expandedCategories.has(category.id);

              return (
                <div
                  key={category.id}
                  className="overflow-hidden rounded-xl border border-border/60 bg-card transition-colors"
                >
                  {/* Category Header */}
                  <div className="flex items-center justify-between px-4 py-3">
                    <button
                      type="button"
                      className="flex flex-1 items-center gap-3"
                      onClick={() => toggleCategory(category.id)}
                    >
                      <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                        {isExpanded ? (
                          <ChevronDown className="size-4" />
                        ) : (
                          <ChevronRight className="size-4" />
                        )}
                      </div>
                      <div className="text-left">
                        <span className="text-sm font-semibold">
                          {category.name}
                        </span>
                        <div className="flex items-center gap-2">
                          {category.weight !== null &&
                            Number(category.weight) > 0 && (
                              <span className="text-xs text-muted-foreground">
                                Weight: {Number(category.weight)}%
                              </span>
                            )}
                          <span className="text-xs text-muted-foreground">
                            {category.grades.length}{" "}
                            {pluralGrades(category.grades.length)}
                          </span>
                        </div>
                      </div>
                    </button>
                    <div className="flex items-center gap-2">
                      {catAvg !== null && (
                        <Badge
                          variant="secondary"
                          className={`text-xs ${getGradeColor(catAvg)}`}
                        >
                          Avg: {catAvg.toFixed(1)}
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-primary"
                        onClick={() =>
                          setAddGradeTarget({
                            id: category.id,
                            name: category.name,
                          })
                        }
                      >
                        <Plus className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-primary"
                        onClick={() => setEditCategoryTarget(category)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          setDeleteCategoryTarget({
                            id: category.id,
                            name: category.name,
                          })
                        }
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Grades List */}
                  {isExpanded && (
                    <div className="border-t border-border/40">
                      {category.grades.length > 0 ? (
                        <div className="divide-y divide-border/30">
                          {category.grades.map((g) => (
                            <div
                              key={g.id}
                              className="group flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-muted/30"
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`flex size-7 items-center justify-center rounded-md text-xs font-bold ${getGradeBgColor(Number(g.value))} ${getGradeColor(Number(g.value))} border`}
                                >
                                  {Math.round(Number(g.value))}
                                </div>
                                <span className="text-sm">{g.name}</span>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 text-muted-foreground hover:text-primary"
                                  onClick={() => setEditGradeTarget(g)}
                                >
                                  <Pencil className="size-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 text-muted-foreground hover:text-destructive"
                                  onClick={() =>
                                    setDeleteGradeTarget({
                                      id: g.id,
                                      name: g.name,
                                    })
                                  }
                                >
                                  <Trash2 className="size-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="px-4 py-6 text-center">
                          <p className="text-sm text-muted-foreground">
                            No grades yet.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3 gap-1.5"
                            onClick={() =>
                              setAddGradeTarget({
                                id: category.id,
                                name: category.name,
                              })
                            }
                          >
                            <Plus className="size-3.5" />
                            Add Grade
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 py-16">
          <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10">
            <GraduationCap className="size-6 text-primary" />
          </div>
          <h3 className="mb-1 text-lg font-semibold">No grade categories</h3>
          <p className="mb-6 max-w-sm text-center text-sm text-muted-foreground">
            Create categories like Exams, Activities, or Lists to start tracking
            your grades.
          </p>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => setCreateCategoryOpen(true)}
          >
            <Plus className="size-4" />
            Add Category
          </Button>
        </div>
      )}

      {/* Dialogs */}
      <CreateCategoryDialog
        subjectId={subjectId}
        open={createCategoryOpen}
        onOpenChange={setCreateCategoryOpen}
      />

      {addGradeTarget && (
        <CreateGradeDialog
          categoryId={addGradeTarget.id}
          categoryName={addGradeTarget.name}
          open={!!addGradeTarget}
          onOpenChange={(open) => {
            if (!open) setAddGradeTarget(null);
          }}
        />
      )}

      {editCategoryTarget && (
        <EditCategoryDialog
          category={editCategoryTarget}
          open={!!editCategoryTarget}
          onOpenChange={(open) => {
            if (!open) setEditCategoryTarget(null);
          }}
        />
      )}

      {deleteCategoryTarget && (
        <DeleteCategoryDialog
          categoryId={deleteCategoryTarget.id}
          categoryName={deleteCategoryTarget.name}
          open={!!deleteCategoryTarget}
          onOpenChange={(open) => {
            if (!open) setDeleteCategoryTarget(null);
          }}
        />
      )}

      {editGradeTarget && (
        <EditGradeDialog
          grade={editGradeTarget}
          open={!!editGradeTarget}
          onOpenChange={(open) => {
            if (!open) setEditGradeTarget(null);
          }}
        />
      )}

      {deleteGradeTarget && (
        <DeleteGradeDialog
          gradeId={deleteGradeTarget.id}
          gradeName={deleteGradeTarget.name}
          open={!!deleteGradeTarget}
          onOpenChange={(open) => {
            if (!open) setDeleteGradeTarget(null);
          }}
        />
      )}
    </div>
  );
}

interface OverallAverageCardProps {
  average: number;
  hasWeights: boolean;
  totalGrades: number;
  totalCategories: number;
}

function OverallAverageCard({
  average,
  hasWeights,
  totalGrades,
  totalCategories,
}: Readonly<OverallAverageCardProps>) {
  const color = getGradeColor(average);
  const bgColor = getGradeBgColor(average);
  const barColor = getGradeBarColor(average);
  const performanceLabel = getPerformanceLabel(average);
  const averageTypeLabel = hasWeights ? "Weighted Average" : "Simple Average";

  return (
    <div className={`rounded-xl border p-5 ${bgColor}`}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className={`size-5 ${color}`} />
          <span className={`text-sm font-semibold ${color}`}>
            {averageTypeLabel}
          </span>
        </div>
        <Badge variant="secondary" className="text-xs">
          <BarChart3 className="mr-1 size-3" />
          {totalGrades} {pluralGrades(totalGrades)} · {totalCategories}{" "}
          {pluralCategories(totalCategories)}
        </Badge>
      </div>

      <div className="mb-2 flex items-end justify-between">
        <div className="text-3xl font-bold tracking-tight">
          {average.toFixed(1)}
          <span className="text-lg font-normal text-muted-foreground">
            {" / 100"}
          </span>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Performance</p>
          <p className={`text-lg font-semibold ${color}`}>{performanceLabel}</p>
        </div>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-background/60">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-500 ease-out`}
          style={{ width: `${Math.min(average, 100)}%` }}
        />
      </div>

      <div className="mt-3 flex justify-between text-xs text-muted-foreground">
        <span>0</span>
        <span>100</span>
      </div>
    </div>
  );
}
