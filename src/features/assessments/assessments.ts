import { getTodayIso } from "@/lib/dates/format";
import type { AssessmentEntity } from "@/lib/server/api-contracts";

export { getTodayIso };

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
  // Study tasks are generated reminders, not graded work.
  const completedWithScore = assessments.filter(
    (item) =>
      item.type !== "study" &&
      item.status === "completed" &&
      item.score !== null,
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
