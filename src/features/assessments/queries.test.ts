import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const limitMock = vi.fn();
const whereMock = vi.fn(() => ({
  limit: limitMock,
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
const isNullMock = vi.fn((column) => ({ column, operator: "isNull" }));

vi.mock("@/db/index", () => ({
  getDb: () => ({
    select: selectMock,
  }),
}));

vi.mock("drizzle-orm", () => ({
  and: andMock,
  count: vi.fn(),
  desc: vi.fn(),
  eq: eqMock,
  isNull: isNullMock,
}));

vi.mock("@/db/schema", () => ({
  assessment: {
    id: "assessment_id_column",
    userId: "assessment_user_id_column",
    subjectId: "assessment_subject_id_column",
  },
  subject: {
    id: "subject_id_column",
    userId: "subject_user_id_column",
    name: "subject_name_column",
    archivedAt: "subject_archived_at_column",
  },
}));

let getAssessmentDetailForUser: typeof import("./queries").getAssessmentDetailForUser;

describe("getAssessmentDetailForUser", () => {
  beforeAll(async () => {
    ({ getAssessmentDetailForUser } = await import("./queries"));
  });

  beforeEach(() => {
    vi.clearAllMocks();
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
    });
    expect(eqMock).toHaveBeenCalledWith("assessment_id_column", "assessment-1");
    expect(eqMock).toHaveBeenCalledWith("assessment_user_id_column", "user-1");
    expect(eqMock).toHaveBeenCalledWith("subject_user_id_column", "user-1");
    expect(isNullMock).toHaveBeenCalledWith("subject_archived_at_column");
  });

  it("returns null when the assessment is missing or inaccessible", async () => {
    limitMock.mockResolvedValueOnce([]);

    const result = await getAssessmentDetailForUser("user-1", "assessment-1");

    expect(result).toBeNull();
  });
});
