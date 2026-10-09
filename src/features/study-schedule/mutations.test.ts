import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GeneratedStudyTask } from "@/features/study-schedule/sync-plan";

interface InsertedTask {
  title: string;
  studyWeek: number;
  dueDate: string;
}

interface FakeSubjectSchedule {
  studyWeekday: number | null;
  studyTermStart: string | null;
  studyTermEnd: string | null;
}

const SUBJECT_TABLE = { table: "subject" };
const ASSESSMENT_TABLE = { table: "assessment" };

class FakeStudyDb {
  subjectRow: FakeSubjectSchedule | null = null;
  tasks: GeneratedStudyTask[] = [];
  lockedSubject = false;
  deletedIds: string[] = [];
  updates: Array<{ table: unknown; values: Record<string, unknown> }> = [];
  inserted: InsertedTask[] = [];
  ignoredConflicts = false;

  async transaction<T>(callback: (tx: FakeStudyDb) => Promise<T>): Promise<T> {
    return callback(this);
  }

  select() {
    return {
      from: (table: unknown) => ({
        where: () =>
          table === SUBJECT_TABLE ? this.subjectQuery() : this.tasksQuery(),
      }),
    };
  }

  update(table: unknown) {
    return {
      set: (values: Record<string, unknown>) => ({
        where: async () => {
          this.updates.push({ table, values });
        },
      }),
    };
  }

  delete() {
    return {
      where: async (condition: { values: string[] }) => {
        this.deletedIds.push(...condition.values);
      },
    };
  }

  insert() {
    return {
      values: (rows: InsertedTask[]) => ({
        onConflictDoNothing: async () => {
          this.ignoredConflicts = true;
          this.inserted.push(...rows);
        },
      }),
    };
  }

  private subjectQuery() {
    return {
      for: async () => {
        this.lockedSubject = true;
        return this.subjectRow ? [this.subjectRow] : [];
      },
    };
  }

  private tasksQuery() {
    return Promise.resolve(this.tasks);
  }
}

const fakeDb = new FakeStudyDb();

vi.mock("@/db/index", () => ({ getDb: () => fakeDb }));
vi.mock("drizzle-orm", () => ({
  and: (...conditions: unknown[]) => conditions,
  eq: (column: unknown, value: unknown) => ({ column, value }),
  inArray: (column: unknown, values: unknown[]) => ({ column, values }),
  isNotNull: (column: unknown) => ({ column }),
  sql: () => "exists-attachment",
}));
vi.mock("@/db/schema", () => ({
  assessment: ASSESSMENT_TABLE,
  assessmentAttachment: {},
  subject: SUBJECT_TABLE,
}));
vi.mock("@/features/subjects/query-helpers", () => ({
  getOwnedAcademicSubjectFilters: () => [],
}));

const schedule = {
  subjectId: "subject-1",
  weekday: 3,
  termStart: "2026-02-04",
  termEnd: "2026-02-18",
};

const savedSchedule: FakeSubjectSchedule = {
  studyWeekday: 3,
  studyTermStart: "2026-02-04",
  studyTermEnd: "2026-02-18",
};

const emptySchedule: FakeSubjectSchedule = {
  studyWeekday: null,
  studyTermStart: null,
  studyTermEnd: null,
};

function pendingWeek(week: number, dueDate: string): GeneratedStudyTask {
  return {
    id: `task-${week}`,
    studyWeek: week,
    status: "pending",
    title: `Study week ${week} content`,
    description: null,
    dueDate,
    hasAttachments: false,
  };
}

describe("study schedule mutations", () => {
  beforeEach(() => {
    fakeDb.subjectRow = { ...emptySchedule };
    fakeDb.tasks = [];
    fakeDb.lockedSubject = false;
    fakeDb.deletedIds = [];
    fakeDb.updates = [];
    fakeDb.inserted = [];
    fakeDb.ignoredConflicts = false;
  });

  it("returns notFound for a non-academic or foreign subject", async () => {
    fakeDb.subjectRow = null;
    const { saveStudyScheduleForUser } = await import(
      "@/features/study-schedule/mutations"
    );

    const result = await saveStudyScheduleForUser("user-1", schedule);

    expect(result).toMatchObject({
      success: false,
      errorCode: "subjects.notFound",
    });
    expect(fakeDb.inserted).toEqual([]);
  });

  it("creates one study task per class week on first save", async () => {
    const { saveStudyScheduleForUser } = await import(
      "@/features/study-schedule/mutations"
    );

    const result = await saveStudyScheduleForUser("user-1", schedule);

    expect(result).toEqual({ success: true, subjectId: "subject-1" });
    expect(fakeDb.lockedSubject).toBe(true);
    expect(fakeDb.inserted.map((task) => task.studyWeek)).toEqual([1, 2, 3]);
    expect(fakeDb.updates[0]).toEqual({
      table: SUBJECT_TABLE,
      values: savedSchedule,
    });
  });

  it("tolerates a concurrent insert of the same week instead of throwing", async () => {
    const { saveStudyScheduleForUser } = await import(
      "@/features/study-schedule/mutations"
    );

    await saveStudyScheduleForUser("user-1", schedule);

    expect(fakeDb.ignoredConflicts).toBe(true);
  });

  it("re-saving an unchanged schedule keeps task ids", async () => {
    fakeDb.subjectRow = { ...savedSchedule };
    fakeDb.tasks = [
      pendingWeek(1, "2026-02-10"),
      pendingWeek(2, "2026-02-17"),
      pendingWeek(3, "2026-02-24"),
    ];
    const { saveStudyScheduleForUser } = await import(
      "@/features/study-schedule/mutations"
    );

    await saveStudyScheduleForUser("user-1", schedule);

    expect(fakeDb.deletedIds).toEqual([]);
    expect(fakeDb.inserted).toEqual([]);
  });

  it("remove deletes untouched tasks and detaches edited ones", async () => {
    fakeDb.subjectRow = { ...savedSchedule };
    fakeDb.tasks = [
      pendingWeek(1, "2026-02-10"),
      { ...pendingWeek(2, "2026-02-17"), description: "chapter 3" },
    ];
    const { removeStudyScheduleForUser } = await import(
      "@/features/study-schedule/mutations"
    );

    const result = await removeStudyScheduleForUser("user-1", "subject-1");

    expect(result).toEqual({ success: true, subjectId: "subject-1" });
    expect(fakeDb.deletedIds).toEqual(["task-1"]);
    expect(fakeDb.updates).toContainEqual({
      table: ASSESSMENT_TABLE,
      values: { studyWeek: null },
    });
    expect(fakeDb.updates[0]).toEqual({
      table: SUBJECT_TABLE,
      values: emptySchedule,
    });
  });
});
