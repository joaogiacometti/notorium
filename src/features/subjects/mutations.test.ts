import { beforeEach, describe, expect, it, vi } from "vitest";

const insertReturningMock = vi.fn();
const insertValuesMock = vi.fn(() => ({
  returning: insertReturningMock,
}));
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
const countChildSubjectsForUserMock = vi.fn();
const getSubjectRecordForUserMock = vi.fn();
const getSubjectRecordsForUserMock = vi.fn();
const getSubjectTreeRecordForUserMock = vi.fn();
const getSubjectDepthForUserMock = vi.fn();
const isSubjectAncestorOfMock = vi.fn();
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
  countChildSubjectsForUser: countChildSubjectsForUserMock,
  getSubjectRecordForUser: getSubjectRecordForUserMock,
  getSubjectRecordsForUser: getSubjectRecordsForUserMock,
  getSubjectTreeRecordForUser: getSubjectTreeRecordForUserMock,
  getSubjectDepthForUser: getSubjectDepthForUserMock,
  isSubjectAncestorOf: isSubjectAncestorOfMock,
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

  it("creates a root subject when the user is below the total subject limit", async () => {
    countTotalSubjectsForUserMock.mockResolvedValueOnce(3);
    insertReturningMock.mockResolvedValueOnce([{ id: "subject-1" }]);

    const { createSubjectForUser } = await import(
      "@/features/subjects/mutations"
    );

    const result = await createSubjectForUser("user-1", {
      name: "  History  ",
      kind: "general",
    });

    expect(result).toEqual({ success: true, subjectId: "subject-1" });
    expect(insertValuesMock).toHaveBeenCalledWith({
      userId: "user-1",
      name: "History",
      kind: "general",
      parentSubjectId: null,
    });
  });

  it("nests under a parent and forces general kind for subfolders", async () => {
    countTotalSubjectsForUserMock.mockResolvedValueOnce(3);
    countChildSubjectsForUserMock.mockResolvedValueOnce(0);
    getSubjectTreeRecordForUserMock.mockResolvedValueOnce({
      id: "parent-1",
      parentSubjectId: null,
      name: "Root",
    });
    getSubjectDepthForUserMock.mockResolvedValueOnce(1);
    insertReturningMock.mockResolvedValueOnce([{ id: "child-1" }]);

    const { createSubjectForUser } = await import(
      "@/features/subjects/mutations"
    );

    const result = await createSubjectForUser("user-1", {
      name: "Chapter 1",
      kind: "academic",
      parentSubjectId: "parent-1",
    });

    expect(result).toEqual({ success: true, subjectId: "child-1" });
    expect(insertValuesMock).toHaveBeenCalledWith({
      userId: "user-1",
      name: "Chapter 1",
      kind: "general",
      parentSubjectId: "parent-1",
    });
  });

  it("rejects nesting past the depth cap", async () => {
    const { LIMITS } = await import("@/lib/config/limits");
    countTotalSubjectsForUserMock.mockResolvedValueOnce(3);
    countChildSubjectsForUserMock.mockResolvedValueOnce(0);
    getSubjectTreeRecordForUserMock.mockResolvedValueOnce({
      id: "parent-1",
      parentSubjectId: null,
      name: "Root",
    });
    getSubjectDepthForUserMock.mockResolvedValueOnce(
      LIMITS.maxSubjectNestingDepth,
    );

    const { createSubjectForUser } = await import(
      "@/features/subjects/mutations"
    );

    const result = await createSubjectForUser("user-1", {
      name: "Too deep",
      kind: "general",
      parentSubjectId: "parent-1",
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: "limits.subjectNestingDepthLimit",
    });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("rejects nesting past the child-count cap", async () => {
    const { LIMITS } = await import("@/lib/config/limits");
    countTotalSubjectsForUserMock.mockResolvedValueOnce(3);
    countChildSubjectsForUserMock.mockResolvedValueOnce(
      LIMITS.maxChildSubjectsPerSubject,
    );
    getSubjectTreeRecordForUserMock.mockResolvedValueOnce({
      id: "parent-1",
      parentSubjectId: null,
      name: "Root",
    });
    getSubjectDepthForUserMock.mockResolvedValueOnce(1);

    const { createSubjectForUser } = await import(
      "@/features/subjects/mutations"
    );

    const result = await createSubjectForUser("user-1", {
      name: "One too many",
      kind: "general",
      parentSubjectId: "parent-1",
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: "limits.childSubjectLimit",
    });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("returns notFound when the parent does not exist", async () => {
    countTotalSubjectsForUserMock.mockResolvedValueOnce(3);
    countChildSubjectsForUserMock.mockResolvedValueOnce(0);
    getSubjectTreeRecordForUserMock.mockResolvedValueOnce(null);
    getSubjectDepthForUserMock.mockResolvedValueOnce(null);

    const { createSubjectForUser } = await import(
      "@/features/subjects/mutations"
    );

    const result = await createSubjectForUser("user-1", {
      name: "Orphan",
      kind: "general",
      parentSubjectId: "missing",
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: "subjects.notFound",
    });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("returns the duplicate name error on a unique constraint violation", async () => {
    countTotalSubjectsForUserMock.mockResolvedValueOnce(3);
    insertReturningMock.mockRejectedValueOnce({ code: "23505" });

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
    insertReturningMock.mockRejectedValueOnce(unexpected);

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
    getSubjectRecordForUserMock.mockResolvedValueOnce({
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

describe("moveSubjectForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns notFound when the subject is inaccessible", async () => {
    getSubjectTreeRecordForUserMock.mockResolvedValueOnce(null);

    const { moveSubjectForUser } = await import(
      "@/features/subjects/mutations"
    );

    const result = await moveSubjectForUser("user-1", {
      id: "subject-1",
      parentSubjectId: "parent-1",
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: "subjects.notFound",
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("no-ops when the parent is unchanged", async () => {
    getSubjectTreeRecordForUserMock.mockResolvedValueOnce({
      id: "subject-1",
      parentSubjectId: "parent-1",
      name: "Sub",
    });

    const { moveSubjectForUser } = await import(
      "@/features/subjects/mutations"
    );

    const result = await moveSubjectForUser("user-1", {
      id: "subject-1",
      parentSubjectId: "parent-1",
    });

    expect(result).toEqual({
      success: true,
      id: "subject-1",
      previousParentSubjectId: "parent-1",
      newParentSubjectId: "parent-1",
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects moving a subject into itself", async () => {
    getSubjectTreeRecordForUserMock.mockResolvedValueOnce({
      id: "subject-1",
      parentSubjectId: null,
      name: "Sub",
    });

    const { moveSubjectForUser } = await import(
      "@/features/subjects/mutations"
    );

    const result = await moveSubjectForUser("user-1", {
      id: "subject-1",
      parentSubjectId: "subject-1",
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: "subjects.cannotMoveIntoSelf",
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects a move that would create a cycle", async () => {
    getSubjectTreeRecordForUserMock.mockResolvedValueOnce({
      id: "subject-1",
      parentSubjectId: null,
      name: "Sub",
    });
    isSubjectAncestorOfMock.mockResolvedValueOnce(true);

    const { moveSubjectForUser } = await import(
      "@/features/subjects/mutations"
    );

    const result = await moveSubjectForUser("user-1", {
      id: "subject-1",
      parentSubjectId: "descendant-1",
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: "subjects.wouldCreateCycle",
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("moves a subject under a new parent", async () => {
    getSubjectTreeRecordForUserMock
      .mockResolvedValueOnce({
        id: "subject-1",
        parentSubjectId: null,
        name: "Sub",
      })
      .mockResolvedValueOnce({
        id: "parent-2",
        parentSubjectId: null,
        name: "Parent 2",
      });
    isSubjectAncestorOfMock.mockResolvedValueOnce(false);
    countChildSubjectsForUserMock.mockResolvedValueOnce(0);
    getSubjectDepthForUserMock.mockResolvedValueOnce(1);
    updateWhereMock.mockResolvedValueOnce([]);

    const { moveSubjectForUser } = await import(
      "@/features/subjects/mutations"
    );

    const result = await moveSubjectForUser("user-1", {
      id: "subject-1",
      parentSubjectId: "parent-2",
    });

    expect(result).toEqual({
      success: true,
      id: "subject-1",
      previousParentSubjectId: null,
      newParentSubjectId: "parent-2",
    });
    expect(updateSetMock).toHaveBeenCalledWith({
      parentSubjectId: "parent-2",
    });
  });

  it("moves a subject to the root", async () => {
    getSubjectTreeRecordForUserMock.mockResolvedValueOnce({
      id: "subject-1",
      parentSubjectId: "parent-1",
      name: "Sub",
    });
    updateWhereMock.mockResolvedValueOnce([]);

    const { moveSubjectForUser } = await import(
      "@/features/subjects/mutations"
    );

    const result = await moveSubjectForUser("user-1", {
      id: "subject-1",
    });

    expect(result).toEqual({
      success: true,
      id: "subject-1",
      previousParentSubjectId: "parent-1",
      newParentSubjectId: null,
    });
    expect(updateSetMock).toHaveBeenCalledWith({ parentSubjectId: null });
  });
});

describe("bulkDeleteSubjectsForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes owned subjects and returns deleted ids", async () => {
    getSubjectRecordsForUserMock.mockResolvedValueOnce([
      { id: "subject-1" },
      { id: "subject-2" },
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
    getSubjectRecordsForUserMock.mockResolvedValueOnce([{ id: "subject-1" }]);

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
