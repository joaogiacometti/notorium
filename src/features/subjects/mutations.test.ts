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
const inArrayMock = vi.fn((column, values) => ({ column, values }));
const isNotNullMock = vi.fn((column) => ({ column, operator: "isNotNull" }));
const isNullMock = vi.fn((column) => ({ column, operator: "isNull" }));
const countTotalSubjectsForUserMock = vi.fn();
const getActiveSubjectRecordForUserMock = vi.fn();
const getArchivedSubjectRecordForUserMock = vi.fn();
const getSubjectRecordForUserMock = vi.fn();
const getSubjectRecordsForUserMock = vi.fn();
const getSubjectAttachmentPathnamesForUserMock = vi.fn();
const cleanupAttachmentPathnamesMock = vi.fn();

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
  inArray: inArrayMock,
  isNotNull: isNotNullMock,
  isNull: isNullMock,
}));

vi.mock("@/db/schema", () => ({
  subject: {
    archivedAt: "subject_archived_at_column",
    id: "subject_id_column",
    userId: "subject_user_id_column",
  },
}));

vi.mock("@/features/attachments/cleanup", () => ({
  cleanupAttachmentPathnames: cleanupAttachmentPathnamesMock,
  getSubjectAttachmentPathnamesForUser:
    getSubjectAttachmentPathnamesForUserMock,
}));

vi.mock("@/features/subjects/queries", () => ({
  countTotalSubjectsForUser: countTotalSubjectsForUserMock,
  getActiveSubjectRecordForUser: getActiveSubjectRecordForUserMock,
  getArchivedSubjectRecordForUser: getArchivedSubjectRecordForUserMock,
  getSubjectRecordForUser: getSubjectRecordForUserMock,
  getSubjectRecordsForUser: getSubjectRecordsForUserMock,
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
      kind: "academic",
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
      kind: "general",
    });

    expect(result).toEqual({ success: true });
    expect(insertValuesMock).toHaveBeenCalledWith({
      userId: "user-1",
      name: "History",
      kind: "general",
    });
  });

  it("returns the duplicate name error on a unique constraint violation", async () => {
    countTotalSubjectsForUserMock.mockResolvedValueOnce(3);
    insertValuesMock.mockRejectedValueOnce({ code: "23505" });

    const { createSubjectForUser } = await import(
      "@/features/subjects/mutations"
    );

    const result = await createSubjectForUser("user-1", {
      name: "History",
      kind: "academic",
    });

    expect(result).toEqual({
      success: false,
      errorCode: "subjects.duplicateName",
      errorParams: undefined,
      errorMessage: undefined,
    });
  });

  it("rethrows non-unique-violation insert errors", async () => {
    countTotalSubjectsForUserMock.mockResolvedValueOnce(3);
    const unexpected = new Error("connection lost");
    insertValuesMock.mockRejectedValueOnce(unexpected);

    const { createSubjectForUser } = await import(
      "@/features/subjects/mutations"
    );

    await expect(
      createSubjectForUser("user-1", { name: "History", kind: "academic" }),
    ).rejects.toThrow(unexpected);
  });
});

describe("editSubjectForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the duplicate name error on a unique constraint violation", async () => {
    getActiveSubjectRecordForUserMock.mockResolvedValueOnce({
      id: "subject-1",
    });
    updateWhereMock.mockRejectedValueOnce({ code: "23505" });

    const { editSubjectForUser } = await import(
      "@/features/subjects/mutations"
    );

    const result = await editSubjectForUser("user-1", {
      id: "subject-1",
      name: "History",
      kind: "academic",
    });

    expect(result).toEqual({
      success: false,
      errorCode: "subjects.duplicateName",
      errorParams: undefined,
      errorMessage: undefined,
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

describe("bulkArchiveSubjectsForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("archives only owned active subjects", async () => {
    getSubjectRecordsForUserMock.mockResolvedValueOnce([
      { id: "subject-1", archivedAt: null },
      { id: "subject-2", archivedAt: null },
    ]);
    updateWhereMock.mockResolvedValueOnce([]);

    const { bulkArchiveSubjectsForUser } = await import(
      "@/features/subjects/mutations"
    );

    const result = await bulkArchiveSubjectsForUser("user-1", {
      ids: ["subject-1", "subject-2"],
    });

    expect(result).toEqual({
      success: true,
      ids: ["subject-1", "subject-2"],
    });
    expect(updateSetMock).toHaveBeenCalledWith({
      archivedAt: expect.any(Date),
    });
    expect(isNullMock).toHaveBeenCalledWith("subject_archived_at_column");
  });

  it("rejects missing or archived subjects", async () => {
    getSubjectRecordsForUserMock.mockResolvedValueOnce([
      { id: "subject-1", archivedAt: new Date("2026-04-20T10:00:00.000Z") },
    ]);

    const { bulkArchiveSubjectsForUser } = await import(
      "@/features/subjects/mutations"
    );

    const result = await bulkArchiveSubjectsForUser("user-1", {
      ids: ["subject-1", "subject-2"],
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: "subjects.notFound",
    });
    expect(updateMock).not.toHaveBeenCalled();
  });
});

describe("bulkRestoreSubjectsForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("restores only owned archived subjects", async () => {
    getSubjectRecordsForUserMock.mockResolvedValueOnce([
      { id: "subject-1", archivedAt: new Date("2026-04-20T10:00:00.000Z") },
    ]);
    updateWhereMock.mockResolvedValueOnce([]);

    const { bulkRestoreSubjectsForUser } = await import(
      "@/features/subjects/mutations"
    );

    const result = await bulkRestoreSubjectsForUser("user-1", {
      ids: ["subject-1"],
    });

    expect(result).toEqual({ success: true, ids: ["subject-1"] });
    expect(updateSetMock).toHaveBeenCalledWith({ archivedAt: null });
    expect(isNotNullMock).toHaveBeenCalledWith("subject_archived_at_column");
  });

  it("rejects active subjects", async () => {
    getSubjectRecordsForUserMock.mockResolvedValueOnce([
      { id: "subject-1", archivedAt: null },
    ]);

    const { bulkRestoreSubjectsForUser } = await import(
      "@/features/subjects/mutations"
    );

    const result = await bulkRestoreSubjectsForUser("user-1", {
      ids: ["subject-1"],
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: "subjects.notFound",
    });
    expect(updateMock).not.toHaveBeenCalled();
  });
});

describe("bulkDeleteSubjectsForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes owned subjects and returns deleted ids", async () => {
    getSubjectRecordsForUserMock.mockResolvedValueOnce([
      { id: "subject-1", archivedAt: null },
      { id: "subject-2", archivedAt: new Date("2026-04-20T10:00:00.000Z") },
    ]);
    getSubjectAttachmentPathnamesForUserMock
      .mockResolvedValueOnce(["attachment-1"])
      .mockResolvedValueOnce(["attachment-2"]);
    deleteWhereMock.mockResolvedValueOnce([]);
    cleanupAttachmentPathnamesMock.mockResolvedValueOnce(undefined);

    const { bulkDeleteSubjectsForUser } = await import(
      "@/features/subjects/mutations"
    );

    const result = await bulkDeleteSubjectsForUser("user-1", {
      ids: ["subject-1", "subject-2"],
    });

    expect(result).toEqual({
      success: true,
      ids: ["subject-1", "subject-2"],
    });
    expect(deleteMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "subject_id_column" }),
    );
    expect(cleanupAttachmentPathnamesMock).toHaveBeenCalledWith("user-1", [
      "attachment-1",
      "attachment-2",
    ]);
  });

  it("rejects inaccessible subjects", async () => {
    getSubjectRecordsForUserMock.mockResolvedValueOnce([
      { id: "subject-1", archivedAt: null },
    ]);

    const { bulkDeleteSubjectsForUser } = await import(
      "@/features/subjects/mutations"
    );

    const result = await bulkDeleteSubjectsForUser("user-1", {
      ids: ["subject-1", "subject-2"],
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: "subjects.notFound",
    });
    expect(deleteMock).not.toHaveBeenCalled();
  });
});
