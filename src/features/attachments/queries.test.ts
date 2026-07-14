import { beforeEach, describe, expect, it, vi } from "vitest";

const limitMock = vi.fn();
const whereMock = vi.fn(() => ({ limit: limitMock }));
const secondJoinMock = vi.fn(() => ({ where: whereMock }));
const firstJoinMock = vi.fn(() => ({ innerJoin: secondJoinMock }));
const fromMock = vi.fn(() => ({ innerJoin: firstJoinMock }));
const selectMock = vi.fn(() => ({ from: fromMock }));
const eqMock = vi.fn((column, value) => ({ column, value }));

vi.mock("@/db/index", () => ({
  getDb: () => ({ select: selectMock }),
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn((...conditions) => conditions),
  eq: eqMock,
  inArray: vi.fn(),
}));

vi.mock("@/db/schema", () => ({
  assessment: {
    id: "assessment_id_column",
    subjectId: "assessment_subject_id_column",
  },
  assessmentAttachment: {
    id: "attachment_id_column",
    assessmentId: "attachment_assessment_id_column",
    userId: "attachment_user_id_column",
  },
  subject: {
    id: "subject_id_column",
    userId: "subject_user_id_column",
    kind: "subject_kind_column",
  },
}));

describe("getAssessmentAttachmentForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hides attachments while their subject is general", async () => {
    limitMock.mockResolvedValueOnce([]);
    const { getAssessmentAttachmentForUser } = await import(
      "@/features/attachments/queries"
    );

    await expect(
      getAssessmentAttachmentForUser("user-1", "attachment-1"),
    ).resolves.toBeNull();

    expect(eqMock).toHaveBeenCalledWith("subject_user_id_column", "user-1");
    expect(eqMock).toHaveBeenCalledWith("subject_kind_column", "academic");
  });
});
