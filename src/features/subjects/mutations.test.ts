import { beforeEach, describe, expect, it, vi } from "vitest";

const insertValuesMock = vi.fn();
const insertMock = vi.fn(() => ({
  values: insertValuesMock,
}));
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
const andMock = vi.fn((...conditions) => conditions);
const eqMock = vi.fn((column, value) => ({ column, value }));
const countTotalSubjectsForUserMock = vi.fn();
const getActiveSubjectRecordForUserMock = vi.fn();
const getArchivedSubjectRecordForUserMock = vi.fn();
const getSubjectRecordForUserMock = vi.fn();

vi.mock("@/db/index", () => ({
  getDb: () => ({
    insert: insertMock,
    update: updateMock,
    delete: deleteMock,
  }),
}));

vi.mock("drizzle-orm", () => ({
  and: andMock,
  eq: eqMock,
}));

vi.mock("@/db/schema", () => ({
  subject: {
    id: "subject_id_column",
    userId: "subject_user_id_column",
  },
}));

vi.mock("@/features/subjects/queries", () => ({
  countTotalSubjectsForUser: countTotalSubjectsForUserMock,
  getActiveSubjectRecordForUser: getActiveSubjectRecordForUserMock,
  getArchivedSubjectRecordForUser: getArchivedSubjectRecordForUserMock,
  getSubjectRecordForUser: getSubjectRecordForUserMock,
}));

describe("createSubjectForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the subject limit error when total owned subjects reaches the max", async () => {
    const { LIMITS } = await import("@/lib/config/limits");
    countTotalSubjectsForUserMock.mockResolvedValueOnce(LIMITS.maxSubjects);

    const { createSubjectForUser } = await import(
      "@/features/subjects/mutations"
    );

    const result = await createSubjectForUser("user-1", {
      name: "History",
      description: "Archived subjects still count",
    });

    expect(result).toEqual({
      success: false,
      errorCode: "limits.subjectLimit",
      errorParams: { max: LIMITS.maxSubjects },
      errorMessage: undefined,
    });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("creates a subject when the user is below the total subject limit", async () => {
    countTotalSubjectsForUserMock.mockResolvedValueOnce(3);
    insertValuesMock.mockResolvedValueOnce([]);

    const { createSubjectForUser } = await import(
      "@/features/subjects/mutations"
    );

    const result = await createSubjectForUser("user-1", {
      name: "  History  ",
      description: "  Reading list  ",
    });

    expect(result).toEqual({ success: true });
    expect(insertValuesMock).toHaveBeenCalledWith({
      userId: "user-1",
      name: "History",
      description: "Reading list",
    });
  });
});

describe("archiveSubjectForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns notFound when the subject is inaccessible", async () => {
    getActiveSubjectRecordForUserMock.mockResolvedValueOnce(null);

    const { archiveSubjectForUser } = await import(
      "@/features/subjects/mutations"
    );

    const result = await archiveSubjectForUser("user-1", { id: "subject-1" });

    expect(result).toEqual({
      success: false,
      errorCode: "subjects.notFound",
      errorParams: undefined,
      errorMessage: undefined,
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("archives the active subject and returns its id", async () => {
    getActiveSubjectRecordForUserMock.mockResolvedValueOnce({
      id: "subject-1",
    });
    updateWhereMock.mockResolvedValueOnce([]);

    const { archiveSubjectForUser } = await import(
      "@/features/subjects/mutations"
    );

    const result = await archiveSubjectForUser("user-1", { id: "subject-1" });

    expect(result).toEqual({ success: true, subjectId: "subject-1" });
    expect(updateSetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        archivedAt: expect.any(Date),
      }),
    );
  });
});

describe("restoreSubjectForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns notFound when the subject is not archived or inaccessible", async () => {
    getArchivedSubjectRecordForUserMock.mockResolvedValueOnce(null);

    const { restoreSubjectForUser } = await import(
      "@/features/subjects/mutations"
    );

    const result = await restoreSubjectForUser("user-1", { id: "subject-1" });

    expect(result).toEqual({
      success: false,
      errorCode: "subjects.notFound",
      errorParams: undefined,
      errorMessage: undefined,
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("clears archivedAt and returns the subject id", async () => {
    getArchivedSubjectRecordForUserMock.mockResolvedValueOnce({
      id: "subject-1",
    });
    updateWhereMock.mockResolvedValueOnce([]);

    const { restoreSubjectForUser } = await import(
      "@/features/subjects/mutations"
    );

    const result = await restoreSubjectForUser("user-1", { id: "subject-1" });

    expect(result).toEqual({ success: true, subjectId: "subject-1" });
    expect(updateSetMock).toHaveBeenCalledWith({
      archivedAt: null,
    });
  });
});

describe("deleteSubjectForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns notFound when the subject is inaccessible", async () => {
    getSubjectRecordForUserMock.mockResolvedValueOnce(null);

    const { deleteSubjectForUser } = await import(
      "@/features/subjects/mutations"
    );

    const result = await deleteSubjectForUser("user-1", { id: "subject-1" });

    expect(result).toEqual({
      success: false,
      errorCode: "subjects.notFound",
      errorParams: undefined,
      errorMessage: undefined,
    });
    expect(deleteMock).not.toHaveBeenCalled();
  });
});
