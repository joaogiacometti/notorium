import { beforeEach, describe, expect, it, vi } from "vitest";

const updateWhereMock = vi.fn();
const updateSetMock = vi.fn(() => ({
  where: updateWhereMock,
}));
const updateMock = vi.fn(() => ({
  set: updateSetMock,
}));
const deleteWhereMock = vi.fn();
const deleteMock = vi.fn(() => ({
  where: deleteWhereMock,
}));
const andMock = vi.fn((...conditions) => ({ type: "and", conditions }));
const eqMock = vi.fn((column, value) => ({ type: "eq", column, value }));
const inArrayMock = vi.fn((column, values) => ({
  type: "inArray",
  column,
  values,
}));
const getAssessmentRecordForUserMock = vi.fn();
const getAssessmentRecordsForUserMock = vi.fn();
const countAssessmentsBySubjectForUserMock = vi.fn();
const getActiveAcademicSubjectRecordForUserMock = vi.fn();
const getAssessmentAttachmentsForAssessmentsMock = vi.fn();
const cleanupAttachmentPathnamesMock = vi.fn();

vi.mock("@/db/index", () => ({
  getDb: () => ({
    update: updateMock,
    delete: deleteMock,
  }),
}));

vi.mock("drizzle-orm", () => ({
  and: andMock,
  eq: eqMock,
  inArray: inArrayMock,
}));

vi.mock("@/db/schema", () => ({
  assessment: {
    id: "assessment_id_column",
    userId: "assessment_user_id_column",
  },
}));

vi.mock("@/features/attachments/queries", () => ({
  getAssessmentAttachmentsForAssessments:
    getAssessmentAttachmentsForAssessmentsMock,
}));

vi.mock("@/features/attachments/cleanup", () => ({
  cleanupAttachmentPathnames: cleanupAttachmentPathnamesMock,
}));

vi.mock("@/features/assessments/queries", () => ({
  countAssessmentsBySubjectForUser: countAssessmentsBySubjectForUserMock,
  getAssessmentRecordForUser: getAssessmentRecordForUserMock,
  getAssessmentRecordsForUser: getAssessmentRecordsForUserMock,
}));

vi.mock("@/features/subjects/queries", () => ({
  getActiveAcademicSubjectRecordForUser:
    getActiveAcademicSubjectRecordForUserMock,
}));

describe("bulkDeleteAssessmentsForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAssessmentAttachmentsForAssessmentsMock.mockResolvedValue([]);
    cleanupAttachmentPathnamesMock.mockResolvedValue(undefined);
  });

  it("deletes owned assessments and returns affected ids and subject ids", async () => {
    getAssessmentRecordsForUserMock.mockResolvedValueOnce([
      { id: "assessment-1", subjectId: "subject-1" },
      { id: "assessment-2", subjectId: "subject-2" },
    ]);

    const { bulkDeleteAssessmentsForUser } = await import(
      "@/features/assessments/mutations"
    );

    const result = await bulkDeleteAssessmentsForUser("user-1", {
      ids: ["assessment-1", "assessment-2"],
    });

    expect(result).toEqual({
      success: true,
      ids: ["assessment-1", "assessment-2"],
      subjectIds: ["subject-1", "subject-2"],
    });
    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(inArrayMock).toHaveBeenCalledWith("assessment_id_column", [
      "assessment-1",
      "assessment-2",
    ]);
  });

  it("returns notFound when part of the selection is inaccessible", async () => {
    getAssessmentRecordsForUserMock.mockResolvedValueOnce([
      { id: "assessment-1", subjectId: "subject-1" },
    ]);

    const { bulkDeleteAssessmentsForUser } = await import(
      "@/features/assessments/mutations"
    );

    const result = await bulkDeleteAssessmentsForUser("user-1", {
      ids: ["assessment-1", "assessment-2"],
    });

    expect(result).toEqual({
      success: false,
      errorCode: "assessments.notFound",
      errorParams: undefined,
      errorMessage: undefined,
    });
  });
});

describe("bulkUpdateAssessmentStatusForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAssessmentAttachmentsForAssessmentsMock.mockResolvedValue([]);
    cleanupAttachmentPathnamesMock.mockResolvedValue(undefined);
  });

  it("updates the status for all owned selected assessments", async () => {
    getAssessmentRecordsForUserMock.mockResolvedValueOnce([
      { id: "assessment-1", subjectId: "subject-1" },
      { id: "assessment-2", subjectId: "subject-1" },
    ]);

    const { bulkUpdateAssessmentStatusForUser } = await import(
      "@/features/assessments/mutations"
    );

    const result = await bulkUpdateAssessmentStatusForUser("user-1", {
      ids: ["assessment-1", "assessment-2"],
      status: "completed",
    });

    expect(result).toEqual({
      success: true,
      ids: ["assessment-1", "assessment-2"],
      status: "completed",
      subjectIds: ["subject-1"],
    });
    expect(updateSetMock).toHaveBeenCalledWith({
      status: "completed",
    });
    expect(updateWhereMock).toHaveBeenCalledTimes(1);
  });

  it("returns notFound when selected assessments are inaccessible", async () => {
    getAssessmentRecordsForUserMock.mockResolvedValueOnce([]);

    const { bulkUpdateAssessmentStatusForUser } = await import(
      "@/features/assessments/mutations"
    );

    const result = await bulkUpdateAssessmentStatusForUser("user-1", {
      ids: ["assessment-1"],
      status: "pending",
    });

    expect(result).toEqual({
      success: false,
      errorCode: "assessments.notFound",
      errorParams: undefined,
      errorMessage: undefined,
    });
  });
});

describe("editAssessmentForUser", () => {
  const editInput = {
    id: "assessment-1",
    subjectId: "subject-1",
    title: "Midterm",
    description: "",
    status: "pending" as const,
    dueDate: "2026-03-01",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    getAssessmentRecordForUserMock.mockResolvedValue({
      id: "assessment-1",
      subjectId: "subject-1",
    });
    updateWhereMock.mockReturnValue({
      returning: async () => [{ id: "assessment-1" }],
    });
  });

  it("detaches a generated study week when the type changes", async () => {
    const { editAssessmentForUser } = await import(
      "@/features/assessments/mutations"
    );

    await editAssessmentForUser("user-1", { ...editInput, type: "exam" });

    expect(updateSetMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: "exam", studyWeek: null }),
    );
  });

  it("keeps the study week while the type stays study", async () => {
    const { editAssessmentForUser } = await import(
      "@/features/assessments/mutations"
    );

    await editAssessmentForUser("user-1", { ...editInput, type: "study" });

    expect(updateSetMock).toHaveBeenCalledWith(
      expect.not.objectContaining({ studyWeek: null }),
    );
  });
});
