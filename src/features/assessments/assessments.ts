import { format } from "date-fns";
import type { AssessmentEntity } from "@/lib/server/api-contracts";

export const assessmentTypeLabels: Record<AssessmentEntity["type"], string> = {
  exam: "Exam",
  assignment: "Assignment",
  project: "Project",
  presentation: "Presentation",
  homework: "Homework",
  other: "Other",
};

export function getTodayIso(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function isAssessmentOverdue(
  item: AssessmentEntity,
  todayIso: string,
): boolean {
  return (
    item.status === "pending" &&
    item.dueDate !== null &&
    item.dueDate < todayIso
  );
}

export function getAssessmentAverage(
  assessments: AssessmentEntity[],
): number | null {
  const completedWithScore = assessments.filter(
    (item) => item.status === "completed" && item.score !== null,
  );

  if (completedWithScore.length === 0) {
    return null;
  }

  const hasWeights = completedWithScore.some(
    (item) => item.weight !== null && Number(item.weight) > 0,
  );

  if (hasWeights) {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const item of completedWithScore) {
      const weight = item.weight === null ? 0 : Number(item.weight);
      if (weight <= 0) {
        continue;
      }
      weightedSum += Number(item.score) * weight;
      totalWeight += weight;
    }

    if (totalWeight === 0) {
      return null;
    }

    return weightedSum / totalWeight;
  }

  const sum = completedWithScore.reduce(
    (acc, item) => acc + Number(item.score),
    0,
  );
  return sum / completedWithScore.length;
}
