import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  bulkDeleteSubjectsForUserMock,
  getAuthenticatedUserIdMock,
  revalidatePathMock,
} = vi.hoisted(() => ({
  bulkDeleteSubjectsForUserMock: vi.fn(),
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
  bulkDeleteSubjectsForUser: bulkDeleteSubjectsForUserMock,
  createSubjectForUser: vi.fn(),
  deleteSubjectForUser: vi.fn(),
  editSubjectForUser: vi.fn(),
}));

vi.mock("@/features/documents/queries", () => ({
  getSubjectDocumentsForUser: vi.fn(),
  getRecentDocumentsForUser: vi.fn(),
}));

vi.mock("@/features/subjects/queries", () => ({
  getSubjectByIdForUser: vi.fn(),
  getAllSubjectsForUser: vi.fn(),
  getSubjectsForUser: vi.fn(),
}));

describe("subject bulk actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthenticatedUserIdMock.mockResolvedValue("user-1");
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
    expect(revalidatePathMock).toHaveBeenCalledWith("/", "layout");
  });
});
