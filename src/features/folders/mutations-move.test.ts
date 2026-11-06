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
  update: typeof updateMock;
  execute: typeof executeMock;
}) => Promise<unknown>;
const executeMock = vi.fn();
const transactionMock = vi.fn((callback: TransactionCallback) =>
  callback({ insert: insertMock, update: updateMock, execute: executeMock }),
);
const andMock = vi.fn((...conditions) => conditions);
const eqMock = vi.fn((column, value) => ({ column, value }));
const inArrayMock = vi.fn((column, values) => ({ column, values }));
const isNotNullMock = vi.fn((column) => ({ column, operator: "isNotNull" }));
const isNullMock = vi.fn((column) => ({ column, operator: "isNull" }));
const countTotalFoldersForUserMock = vi.fn();
const countChildFoldersForUserMock = vi.fn();
const getAllFoldersWithPathsForUserMock = vi.fn();
const getFolderRecordForUserMock = vi.fn();
const getFolderTreeRecordForUserMock = vi.fn();
const getFolderDepthForUserMock = vi.fn();
const getFolderSubtreeHeightForUserMock = vi.fn();
const isFolderAncestorOfMock = vi.fn();

vi.mock("@/db/index", () => ({
  getDb: () => ({
    insert: insertMock,
    update: updateMock,
    delete: deleteMock,
    transaction: transactionMock,
  }),
}));

vi.mock("drizzle-orm", () => ({
  sql: vi.fn(),
  and: andMock,
  eq: eqMock,
  inArray: inArrayMock,
  isNotNull: isNotNullMock,
  isNull: isNullMock,
}));

vi.mock("@/db/schema", () => ({
  folder: {
    id: "folder_id_column",
    userId: "folder_user_id_column",
  },
}));

vi.mock("@/features/folders/queries", () => ({
  countTotalFoldersForUser: countTotalFoldersForUserMock,
  countChildFoldersForUser: countChildFoldersForUserMock,
  getAllFoldersWithPathsForUser: getAllFoldersWithPathsForUserMock,
  getFolderRecordForUser: getFolderRecordForUserMock,
  getFolderTreeRecordForUser: getFolderTreeRecordForUserMock,
  getFolderDepthForUser: getFolderDepthForUserMock,
  getFolderSubtreeHeightForUser: getFolderSubtreeHeightForUserMock,
  isFolderAncestorOf: isFolderAncestorOfMock,
}));

describe("moveFolderForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getFolderSubtreeHeightForUserMock.mockResolvedValue(1);
  });

  it("returns notFound when the folder is inaccessible", async () => {
    getFolderTreeRecordForUserMock.mockResolvedValueOnce(null);

    const { moveFolderForUser } = await import("@/features/folders/mutations");

    const result = await moveFolderForUser("user-1", {
      id: "folder-1",
      parentFolderId: "parent-1",
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: "folders.notFound",
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("no-ops when the parent is unchanged", async () => {
    getFolderTreeRecordForUserMock.mockResolvedValueOnce({
      id: "folder-1",
      parentFolderId: "parent-1",
      name: "Sub",
    });

    const { moveFolderForUser } = await import("@/features/folders/mutations");

    const result = await moveFolderForUser("user-1", {
      id: "folder-1",
      parentFolderId: "parent-1",
    });

    expect(result).toEqual({
      success: true,
      id: "folder-1",
      previousParentFolderId: "parent-1",
      newParentFolderId: "parent-1",
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects moving a folder into itself", async () => {
    getFolderTreeRecordForUserMock.mockResolvedValueOnce({
      id: "folder-1",
      parentFolderId: null,
      name: "Sub",
    });

    const { moveFolderForUser } = await import("@/features/folders/mutations");

    const result = await moveFolderForUser("user-1", {
      id: "folder-1",
      parentFolderId: "folder-1",
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: "folders.cannotMoveIntoSelf",
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects a move that would create a cycle", async () => {
    getFolderTreeRecordForUserMock.mockResolvedValueOnce({
      id: "folder-1",
      parentFolderId: null,
      name: "Sub",
    });
    isFolderAncestorOfMock.mockResolvedValueOnce(true);

    const { moveFolderForUser } = await import("@/features/folders/mutations");

    const result = await moveFolderForUser("user-1", {
      id: "folder-1",
      parentFolderId: "descendant-1",
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: "folders.wouldCreateCycle",
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("moves a folder under a new parent", async () => {
    getFolderTreeRecordForUserMock
      .mockResolvedValueOnce({
        id: "folder-1",
        parentFolderId: null,
        name: "Sub",
      })
      .mockResolvedValueOnce({
        id: "parent-2",
        parentFolderId: null,
        name: "Parent 2",
      });
    isFolderAncestorOfMock.mockResolvedValueOnce(false);
    countChildFoldersForUserMock.mockResolvedValueOnce(0);
    getFolderDepthForUserMock.mockResolvedValueOnce(1);
    updateWhereMock.mockResolvedValueOnce([]);

    const { moveFolderForUser } = await import("@/features/folders/mutations");

    const result = await moveFolderForUser("user-1", {
      id: "folder-1",
      parentFolderId: "parent-2",
    });

    expect(result).toEqual({
      success: true,
      id: "folder-1",
      previousParentFolderId: null,
      newParentFolderId: "parent-2",
    });
    expect(updateSetMock).toHaveBeenCalledWith({
      parentFolderId: "parent-2",
    });
  });

  it("rejects a move when the subtree would exceed the depth cap", async () => {
    const { LIMITS } = await import("@/lib/config/limits");
    getFolderTreeRecordForUserMock
      .mockResolvedValueOnce({
        id: "folder-1",
        parentFolderId: null,
        name: "Subtree",
      })
      .mockResolvedValueOnce({
        id: "parent-2",
        parentFolderId: null,
        name: "Parent 2",
      });
    isFolderAncestorOfMock.mockResolvedValueOnce(false);
    countChildFoldersForUserMock.mockResolvedValueOnce(0);
    getFolderDepthForUserMock.mockResolvedValueOnce(2);
    getFolderSubtreeHeightForUserMock.mockResolvedValueOnce(3);

    const { moveFolderForUser } = await import("@/features/folders/mutations");

    const result = await moveFolderForUser("user-1", {
      id: "folder-1",
      parentFolderId: "parent-2",
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: "limits.folderNestingDepthLimit",
      errorParams: { max: LIMITS.maxFolderNestingDepth },
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("moves a folder to the root", async () => {
    getFolderTreeRecordForUserMock.mockResolvedValueOnce({
      id: "folder-1",
      parentFolderId: "parent-1",
      name: "Sub",
    });
    updateWhereMock.mockResolvedValueOnce([]);

    const { moveFolderForUser } = await import("@/features/folders/mutations");

    const result = await moveFolderForUser("user-1", {
      id: "folder-1",
    });

    expect(result).toEqual({
      success: true,
      id: "folder-1",
      previousParentFolderId: "parent-1",
      newParentFolderId: null,
    });
    expect(updateSetMock).toHaveBeenCalledWith({ parentFolderId: null });
  });
});
