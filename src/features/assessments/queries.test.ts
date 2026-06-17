import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const limitMock = vi.fn();
const orderByMock = vi.fn(() => ({
  limit: limitMock,
}));
const whereMock = vi.fn(() => ({
  limit: limitMock,
  orderBy: orderByMock,
}));
const innerJoinMock = vi.fn(() => ({
  where: whereMock,
}));
const fromMock = vi.fn(() => ({
  innerJoin: innerJoinMock,
}));
const selectMock = vi.fn(() => ({
  from: fromMock,
}));
const andMock = vi.fn((...conditions) => conditions);
const eqMock = vi.fn((column, value) => ({ column, value }));
const gteMock = vi.fn((column, value) => ({ column, value, operator: "gte" }));
const ascMock = vi.fn((column) => ({ column, operator: "asc" }));
const isNullMock = vi.fn((column) => ({ column, operator: "isNull" }));
const getAssessmentAttachmentsForUserMock = vi.fn();

vi.mock("@/db/index", () => ({
  getDb: () => ({
    select: selectMock,
  }),
}));

vi.mock("drizzle-orm", () => ({
  and: andMock,
  asc: ascMock,
  count: vi.fn(),
  desc: vi.fn(),
  eq: eqMock,
  gte: gteMock,
  isNull: isNullMock,
}));

vi.mock("@/db/schema", () => ({
  assessment: {
    id: "assessment_id_column",
    userId: "assessment_user_id_column",
    subjectId: "assessment_subject_id_column",
    dueDate: "assessment_due_date_column",
  },
  subject: {
    id: "subject_id_column",
    userId: "subject_user_id_column",
    name: "subject_name_column",
    archivedAt: "subject_archived_at_column",
  },
}));

vi.mock("@/features/attachments/queries", () => ({
  getAssessmentAttachmentsForUser: getAssessmentAttachmentsForUserMock,
}));

let getAssessmentDetailForUser: typeof import("./queries").getAssessmentDetailForUser;

describe("getAssessmentDetailForUser", () => {
  beforeAll(async () => {
    ({ getAssessmentDetailForUser } = await import("./queries"));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    getAssessmentAttachmentsForUserMock.mockResolvedValue([]);
  });

  it("returns the assessment detail for an owned active subject", async () => {
    limitMock.mockResolvedValueOnce([
      {
        assessment: {
          id: "assessment-1",
          subjectId: "subject-1",
          title: "Midterm",
        },
        subject: {
          id: "subject-1",
          name: "Physics",
        },
      },
    ]);

    const result = await getAssessmentDetailForUser("user-1", "assessment-1");

    expect(result).toEqual({
      assessment: {
        id: "assessment-1",
        subjectId: "subject-1",
        title: "Midterm",
      },
      subject: {
        id: "subject-1",
        name: "Physics",
      },
      attachments: [],
    });
    expect(eqMock).toHaveBeenCalledWith("assessment_id_column", "assessment-1");
    expect(eqMock).toHaveBeenCalledWith("assessment_user_id_column", "user-1");
    expect(eqMock).toHaveBeenCalledWith("subject_user_id_column", "user-1");
  });

  it("returns null when the assessment is missing or inaccessible", async () => {
    limitMock.mockResolvedValueOnce([]);

    const result = await getAssessmentDetailForUser("user-1", "assessment-1");

    expect(result).toBeNull();
  });
});

describe("getUpcomingAssessmentsForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("filters to due-today-or-later, orders by due date, and limits", async () => {
    limitMock.mockResolvedValueOnce([
      { assessment: { id: "assessment-1", dueDate: "2026-06-18" } },
    ]);

    const { getUpcomingAssessmentsForUser } = await import("./queries");
    const result = await getUpcomingAssessmentsForUser("user-1", 5);

    expect(result).toEqual([{ id: "assessment-1", dueDate: "2026-06-18" }]);
    expect(gteMock).toHaveBeenCalledWith(
      "assessment_due_date_column",
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    );
    expect(ascMock).toHaveBeenCalledWith("assessment_due_date_column");
    expect(orderByMock).toHaveBeenCalled();
    expect(limitMock).toHaveBeenCalledWith(5);
  });
});
