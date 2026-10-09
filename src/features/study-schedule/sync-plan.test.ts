import { describe, expect, it } from "vitest";
import {
  type GeneratedStudyTask,
  planStudyTaskSync,
} from "@/features/study-schedule/sync-plan";
import { buildStudyWeekOccurrences } from "@/features/study-schedule/utils";

// 2026-02-04 is a Wednesday: three class weeks before 2026-02-18.
const wednesdays = buildStudyWeekOccurrences(3, "2026-02-04", "2026-02-18");
// Same term on Thursdays: every week's due date moves by one day.
const thursdays = buildStudyWeekOccurrences(4, "2026-02-04", "2026-02-19");

function generatedTask(
  week: number,
  overrides: Partial<GeneratedStudyTask> = {},
): GeneratedStudyTask {
  return {
    id: `task-${week}`,
    studyWeek: week,
    status: "pending",
    title: `Study week ${week} content`,
    description: null,
    dueDate: wednesdays[week - 1]?.dueDate ?? null,
    hasAttachments: false,
    ...overrides,
  };
}

describe("planStudyTaskSync", () => {
  it("inserts every week on first save", () => {
    const plan = planStudyTaskSync([], [], wednesdays);

    expect(plan.inserts.map((item) => item.week)).toEqual([1, 2, 3]);
  });

  it("is a no-op when re-saving an unchanged schedule", () => {
    const tasks = [generatedTask(1), generatedTask(2), generatedTask(3)];

    const plan = planStudyTaskSync(tasks, wednesdays, wednesdays);

    expect(plan).toEqual({
      inserts: [],
      updates: [],
      deleteIds: [],
      detachIds: [],
    });
  });

  it("moves untouched pending tasks in place instead of recreating them", () => {
    const tasks = [generatedTask(1), generatedTask(2), generatedTask(3)];

    const plan = planStudyTaskSync(tasks, wednesdays, thursdays);

    expect(plan.updates.map((item) => item.id)).toEqual([
      "task-1",
      "task-2",
      "task-3",
    ]);
    expect(plan.inserts).toEqual([]);
    expect(plan.deleteIds).toEqual([]);
  });

  it("deletes untouched pending tasks past the new term end", () => {
    const shorter = wednesdays.slice(0, 2);

    const plan = planStudyTaskSync([generatedTask(3)], wednesdays, shorter);

    expect(plan.deleteIds).toEqual(["task-3"]);
  });

  it("keeps edited tasks attached while their week is unchanged", () => {
    const tasks = [
      generatedTask(1, { description: "chapter 2" }),
      generatedTask(2, { hasAttachments: true }),
      generatedTask(3, { title: "Read slides" }),
    ];

    const plan = planStudyTaskSync(tasks, wednesdays, wednesdays);

    expect(plan.deleteIds).toEqual([]);
    expect(plan.detachIds).toEqual([]);
    expect(plan.inserts).toEqual([]);
  });

  it("never deletes edited tasks when their week moves or disappears", () => {
    const tasks = [
      generatedTask(1, { description: "notes" }),
      generatedTask(2, { dueDate: "2026-03-01" }),
    ];

    const plan = planStudyTaskSync(tasks, wednesdays, thursdays);

    expect(plan.deleteIds).toEqual([]);
    expect(plan.detachIds).toEqual(["task-1", "task-2"]);
    expect(plan.inserts.map((item) => item.week)).toEqual([1, 2, 3]);
  });

  it("creates the moved week when a completed task no longer matches it", () => {
    const tasks = [generatedTask(1, { status: "completed" })];

    const plan = planStudyTaskSync(tasks, wednesdays, thursdays);

    expect(plan.detachIds).toEqual(["task-1"]);
    expect(plan.inserts.map((item) => item.week)).toEqual([1, 2, 3]);
  });

  it("keeps a completed week when its dates are unchanged", () => {
    const tasks = [generatedTask(1, { status: "completed" })];

    const plan = planStudyTaskSync(tasks, wednesdays, wednesdays);

    expect(plan.detachIds).toEqual([]);
    expect(plan.inserts.map((item) => item.week)).toEqual([2, 3]);
  });

  it("on removal deletes untouched tasks and detaches the rest", () => {
    const tasks = [
      generatedTask(1),
      generatedTask(2, { status: "completed" }),
      generatedTask(3, { description: "notes" }),
    ];

    const plan = planStudyTaskSync(tasks, wednesdays, []);

    expect(plan.deleteIds).toEqual(["task-1"]);
    expect(plan.detachIds).toEqual(["task-2", "task-3"]);
    expect(plan.inserts).toEqual([]);
  });
});
