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
type TransactionCallback = (transaction: {
  insert: typeof insertMock;
}) => Promise<unknown>;
const transactionMock = vi.fn((callback: TransactionCallback) =>
  callback({ insert: insertMock }),
);
const andMock = vi.fn((...conditions) => conditions);
const eqMock = vi.fn((column, value) => ({ column, value }));
const inArrayMock = vi.fn((column, values) => ({ column, values }));
const isNotNullMock = vi.fn((column) => ({ column, operator: "isNotNull" }));
const isNullMock = vi.fn((column) => ({ column, operator: "isNull" }));
const countTotalSubjectsForUserMock = vi.fn();
const countChildSubjectsForUserMock = vi.fn();
const getAllSubjectsWithPathsForUserMock = vi.fn();
const getSubjectRecordForUserMock = vi.fn();
const getSubjectRecordsForUserMock = vi.fn();
const getSubjectTreeRecordForUserMock = vi.fn();
const getSubjectDepthForUserMock = vi.fn();
const getSubjectSubtreeHeightForUserMock = vi.fn();
const isSubjectAncestorOfMock = vi.fn();
const getSubjectAttachmentPathnamesForUserMock = vi.fn();
const cleanupAttachmentPathnamesMock = vi.fn();

vi.mock("@/db/index", () => ({
  getDb: () => ({
    insert: insertMock,
    update: updateMock,
    delete: deleteMock,
    transaction: transactionMock,
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
  getAllSubjectsWithPathsForUser: getAllSubjectsWithPathsForUserMock,
  getSubjectRecordForUser: getSubjectRecordForUserMock,
  getSubjectRecordsForUser: getSubjectRecordsForUserMock,
  getSubjectTreeRecordForUser: getSubjectTreeRecordForUserMock,
  getSubjectDepthForUser: getSubjectDepthForUserMock,
  getSubjectSubtreeHeightForUser: getSubjectSubtreeHeightForUserMock,
  isSubjectAncestorOf: isSubjectAncestorOfMock,
}));

describe("moveSubjectForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSubjectSubtreeHeightForUserMock.mockResolvedValue(1);
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

  it("rejects moving an academic subject", async () => {
    getSubjectTreeRecordForUserMock.mockResolvedValueOnce({
      id: "subject-1",
      parentSubjectId: null,
      name: "Calculus",
      kind: "academic",
    });

    const { moveSubjectForUser } = await import(
      "@/features/subjects/mutations"
    );

    const result = await moveSubjectForUser("user-1", {
      id: "subject-1",
      parentSubjectId: "parent-1",
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: "subjects.academicNotMovable",
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

  it("rejects a move when the subtree would exceed the depth cap", async () => {
    const { LIMITS } = await import("@/lib/config/limits");
    getSubjectTreeRecordForUserMock
      .mockResolvedValueOnce({
        id: "subject-1",
        parentSubjectId: null,
        name: "Subtree",
      })
      .mockResolvedValueOnce({
        id: "parent-2",
        parentSubjectId: null,
        name: "Parent 2",
      });
    isSubjectAncestorOfMock.mockResolvedValueOnce(false);
    countChildSubjectsForUserMock.mockResolvedValueOnce(0);
    getSubjectDepthForUserMock.mockResolvedValueOnce(2);
    getSubjectSubtreeHeightForUserMock.mockResolvedValueOnce(3);

    const { moveSubjectForUser } = await import(
      "@/features/subjects/mutations"
    );

    const result = await moveSubjectForUser("user-1", {
      id: "subject-1",
      parentSubjectId: "parent-2",
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: "limits.subjectNestingDepthLimit",
      errorParams: { max: LIMITS.maxSubjectNestingDepth },
    });
    expect(updateMock).not.toHaveBeenCalled();
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
