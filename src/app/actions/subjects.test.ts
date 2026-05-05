import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  bulkArchiveSubjectsForUserMock,
  bulkDeleteSubjectsForUserMock,
  bulkRestoreSubjectsForUserMock,
  getAuthenticatedUserIdMock,
  revalidatePathMock,
} = vi.hoisted(() => ({
  bulkArchiveSubjectsForUserMock: vi.fn(),
  bulkDeleteSubjectsForUserMock: vi.fn(),
  bulkRestoreSubjectsForUserMock: vi.fn(),
  getAuthenticatedUserIdMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/lib/auth/auth", () => ({
  getAuthenticatedUserId: getAuthenticatedUserIdMock,
}));

vi.mock("@/features/subjects/mutations", () => ({
  archiveSubjectForUser: vi.fn(),
  bulkArchiveSubjectsForUser: bulkArchiveSubjectsForUserMock,
  bulkDeleteSubjectsForUser: bulkDeleteSubjectsForUserMock,
  bulkRestoreSubjectsForUser: bulkRestoreSubjectsForUserMock,
  createSubjectForUser: vi.fn(),
  deleteSubjectForUser: vi.fn(),
  editSubjectForUser: vi.fn(),
  restoreSubjectForUser: vi.fn(),
}));

vi.mock("@/features/subjects/queries", () => ({
  getActiveSubjectByIdForUser: vi.fn(),
  getAllSubjectsForUser: vi.fn(),
  getArchivedSubjectsForUser: vi.fn(),
  getSubjectsForUser: vi.fn(),
}));

describe("subject bulk actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthenticatedUserIdMock.mockResolvedValue("user-1");
  });

  it("bulkArchiveSubjects rejects empty ids before mutation", async () => {
    const { bulkArchiveSubjects } = await import("@/app/actions/subjects");

    const result = await bulkArchiveSubjects({ ids: [] });

    expect(result).toMatchObject({
      success: false,
      errorCode: "ServerErrors.common.invalidRequest",
    });
    expect(bulkArchiveSubjectsForUserMock).not.toHaveBeenCalled();
  });

  it("bulkRestoreSubjects rejects empty ids before mutation", async () => {
    const { bulkRestoreSubjects } = await import("@/app/actions/subjects");

    const result = await bulkRestoreSubjects({ ids: [] });

    expect(result).toMatchObject({
      success: false,
      errorCode: "ServerErrors.common.invalidRequest",
    });
    expect(bulkRestoreSubjectsForUserMock).not.toHaveBeenCalled();
  });

  it("bulkDeleteSubjects rejects empty ids before mutation", async () => {
    const { bulkDeleteSubjects } = await import("@/app/actions/subjects");

    const result = await bulkDeleteSubjects({ ids: [] });

    expect(result).toMatchObject({
      success: false,
      errorCode: "ServerErrors.common.invalidRequest",
    });
    expect(bulkDeleteSubjectsForUserMock).not.toHaveBeenCalled();
  });

  it("revalidates subject routes after bulk success", async () => {
    bulkDeleteSubjectsForUserMock.mockResolvedValueOnce({
      success: true,
      ids: ["subject-1"],
    });

    const { bulkDeleteSubjects } = await import("@/app/actions/subjects");

    const result = await bulkDeleteSubjects({ ids: ["subject-1"] });

    expect(result).toEqual({ success: true, ids: ["subject-1"] });
    expect(bulkDeleteSubjectsForUserMock).toHaveBeenCalledWith("user-1", {
      ids: ["subject-1"],
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/subjects");
    expect(revalidatePathMock).toHaveBeenCalledWith("/subjects/archived");
  });
});
