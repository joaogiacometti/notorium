import { beforeEach, describe, expect, it, vi } from "vitest";

const whereMock = vi.fn();
const leftJoinMock = vi.fn(() => ({
  where: whereMock,
}));
const innerJoinSubjectMock = vi.fn(() => ({
  leftJoin: leftJoinMock,
}));
const innerJoinAssessmentMock = vi.fn(() => ({
  innerJoin: innerJoinSubjectMock,
}));
const fromMock = vi.fn(() => ({
  innerJoin: innerJoinAssessmentMock,
}));
const selectMock = vi.fn(() => ({
  from: fromMock,
}));
const andMock = vi.fn((...conditions) => conditions);
const eqMock = vi.fn((column, value) => ({ column, value }));
const gteMock = vi.fn((column, value) => ({ column, value, operator: "gte" }));
const isNotNullMock = vi.fn((column) => ({ column, operator: "isNotNull" }));
const isNullMock = vi.fn((column) => ({ column, operator: "isNull" }));
const orMock = vi.fn((...conditions) => conditions);
const sqlMock = vi.fn((strings) => strings.join("?"));

vi.mock("@/db/index", () => ({
  getDb: () => ({
    select: selectMock,
  }),
}));

vi.mock("drizzle-orm", () => ({
  and: andMock,
  eq: eqMock,
  gte: gteMock,
  isNotNull: isNotNullMock,
  isNull: isNullMock,
  or: orMock,
  sql: sqlMock,
}));

vi.mock("@/db/schema", () => ({
  assessment: {
    id: "assessment_id_column",
    userId: "assessment_user_id_column",
    subjectId: "assessment_subject_id_column",
    title: "assessment_title_column",
    type: "assessment_type_column",
    dueDate: "assessment_due_date_column",
    status: "assessment_status_column",
  },
  notificationLog: {
    id: "notification_log_id_column",
    assessmentId: "notification_log_assessment_id_column",
    userId: "notification_log_user_id_column",
    notificationDate: "notification_log_date_column",
    status: "notification_log_status_column",
  },
  subject: {
    id: "subject_id_column",
    name: "subject_name_column",
    archivedAt: "subject_archived_at_column",
  },
  user: {
    id: "user_id_column",
    email: "user_email_column",
    name: "user_name_column",
    accessStatus: "user_access_status_column",
    notificationsEnabled: "user_notifications_enabled_column",
    notificationDaysBefore: "user_notification_days_before_column",
  },
}));

describe("getUsersWithUpcomingAssessments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("filters reminder candidates to approved users", async () => {
    whereMock.mockResolvedValueOnce([]);

    const { getUsersWithUpcomingAssessments } = await import("./queries");

    await getUsersWithUpcomingAssessments("2026-04-14");

    expect(eqMock).toHaveBeenCalledWith("user_access_status_column", "approved");
    expect(eqMock).toHaveBeenCalledWith(
      "user_notifications_enabled_column",
      true,
    );
  });

  it("groups matching rows by user", async () => {
    whereMock.mockResolvedValueOnce([
      {
        userId: "user-1",
        email: "user@example.com",
        name: "User",
        assessmentId: "assessment-1",
        assessmentTitle: "Midterm",
        assessmentType: "exam",
        assessmentDueDate: "2026-04-15",
        subjectName: "Math",
      },
      {
        userId: "user-1",
        email: "user@example.com",
        name: "User",
        assessmentId: "assessment-2",
        assessmentTitle: "Essay",
        assessmentType: "assignment",
        assessmentDueDate: "2026-04-16",
        subjectName: "History",
      },
    ]);

    const { getUsersWithUpcomingAssessments } = await import("./queries");

    const result = await getUsersWithUpcomingAssessments("2026-04-14");

    expect(result).toEqual([
      {
        userId: "user-1",
        email: "user@example.com",
        name: "User",
        assessments: [
          {
            id: "assessment-1",
            title: "Midterm",
            type: "exam",
            dueDate: "2026-04-15",
            subjectName: "Math",
          },
          {
            id: "assessment-2",
            title: "Essay",
            type: "assignment",
            dueDate: "2026-04-16",
            subjectName: "History",
          },
        ],
      },
    ]);
  });
});
