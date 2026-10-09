import {
  buildStudyWeekTitle,
  type StudyWeekOccurrence,
} from "@/features/study-schedule/utils";

export interface GeneratedStudyTask {
  id: string;
  studyWeek: number;
  status: "pending" | "completed";
  title: string;
  description: string | null;
  dueDate: string | null;
  hasAttachments: boolean;
}

export interface StudyTaskSyncPlan {
  inserts: StudyWeekOccurrence[];
  updates: Array<{ id: string; occurrence: StudyWeekOccurrence }>;
  deleteIds: string[];
  detachIds: string[];
}

/**
 * Diffs existing generated study tasks against a new schedule. Tasks keep their
 * IDs whenever possible so reminder dedupe (notification_log) survives a save.
 * Only untouched pending tasks are moved or deleted; completed or user-edited
 * tasks stay attached while their week's dates are unchanged and are otherwise
 * detached into standalone tasks, freeing the week for a fresh task.
 * Pass an empty `next` to plan a schedule removal.
 *
 * @example
 * planStudyTaskSync(tasks, previousOccurrences, nextOccurrences);
 */
export function planStudyTaskSync(
  tasks: GeneratedStudyTask[],
  previous: StudyWeekOccurrence[],
  next: StudyWeekOccurrence[],
): StudyTaskSyncPlan {
  const plan: StudyTaskSyncPlan = {
    inserts: [],
    updates: [],
    deleteIds: [],
    detachIds: [],
  };
  const coveredWeeks = new Set<number>();

  for (const task of tasks) {
    const nextWeek = next[task.studyWeek - 1];
    const previousWeek = previous[task.studyWeek - 1];
    if (isUntouchedTask(task, previousWeek)) {
      planUntouchedTask(plan, task, nextWeek, coveredWeeks);
    } else {
      planEditedTask(plan, task, previousWeek, nextWeek, coveredWeeks);
    }
  }

  plan.inserts = next.filter((item) => !coveredWeeks.has(item.week));
  return plan;
}

function isUntouchedTask(
  task: GeneratedStudyTask,
  previousWeek: StudyWeekOccurrence | undefined,
): boolean {
  return (
    task.status === "pending" &&
    task.title === buildStudyWeekTitle(task.studyWeek) &&
    !task.description &&
    !task.hasAttachments &&
    task.dueDate === previousWeek?.dueDate
  );
}

function planUntouchedTask(
  plan: StudyTaskSyncPlan,
  task: GeneratedStudyTask,
  nextWeek: StudyWeekOccurrence | undefined,
  coveredWeeks: Set<number>,
): void {
  if (!nextWeek) {
    plan.deleteIds.push(task.id);
    return;
  }
  coveredWeeks.add(task.studyWeek);
  if (task.dueDate !== nextWeek.dueDate) {
    plan.updates.push({ id: task.id, occurrence: nextWeek });
  }
}

function planEditedTask(
  plan: StudyTaskSyncPlan,
  task: GeneratedStudyTask,
  previousWeek: StudyWeekOccurrence | undefined,
  nextWeek: StudyWeekOccurrence | undefined,
  coveredWeeks: Set<number>,
): void {
  const weekUnchanged =
    nextWeek !== undefined && previousWeek?.dueDate === nextWeek.dueDate;
  if (!weekUnchanged) {
    plan.detachIds.push(task.id);
    return;
  }
  coveredWeeks.add(task.studyWeek);
}
