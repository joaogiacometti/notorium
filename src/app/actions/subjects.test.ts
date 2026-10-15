import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  bulkDeleteSubjectsForUserMock,
  getAuthenticatedUserIdMock,
  getSubjectDocumentsForUserMock,
  revalidatePathMock,
} = vi.hoisted(() => ({
  bulkDeleteSubjectsForUserMock: vi.fn(),
  getAuthenticatedUserIdMock: vi.fn(),
  getSubjectDocumentsForUserMock: vi.fn(),
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
  getSubjectDocumentsForUser: getSubjectDocumentsForUserMock,
  getRecentDocumentsForUser: vi.fn(),
}));

vi.mock("@/features/subjects/queries", () => ({
  getSubjectByIdForUser: vi.fn(),
  getAllSubjectsForUser: vi.fn(),
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

describe("getSubjectDocuments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthenticatedUserIdMock.mockResolvedValue("user-1");
  });

  it("rejects an empty subject id before querying", async () => {
    const { getSubjectDocuments } = await import("@/app/actions/subjects");

    await expect(getSubjectDocuments("")).rejects.toThrow();
    expect(getSubjectDocumentsForUserMock).not.toHaveBeenCalled();
  });

  it("returns the user's documents for the subject", async () => {
    getSubjectDocumentsForUserMock.mockResolvedValueOnce([{ id: "note-1" }]);
    const { getSubjectDocuments } = await import("@/app/actions/subjects");

    const result = await getSubjectDocuments("subject-1");

    expect(result).toEqual([{ id: "note-1" }]);
    expect(getSubjectDocumentsForUserMock).toHaveBeenCalledWith(
      "user-1",
      "subject-1",
    );
  });
});
