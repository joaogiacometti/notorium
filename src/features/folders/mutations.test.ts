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

describe("createFolderForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertReturningMock.mockReset();
    getFolderSubtreeHeightForUserMock.mockResolvedValue(1);
  });

  it("returns the folder limit error when total owned folders reaches the max", async () => {
    const { LIMITS } = await import("@/lib/config/limits");
    countTotalFoldersForUserMock.mockResolvedValueOnce(LIMITS.maxFolders);

    const { createFolderForUser } = await import(
      "@/features/folders/mutations"
    );

    const result = await createFolderForUser("user-1", {
      name: "History",
    });

    expect(result).toEqual({
      success: false,
      errorCode: "limits.folderLimit",
      errorParams: { max: LIMITS.maxFolders },
      errorMessage: undefined,
    });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("creates a root folder when the user is below the total folder limit", async () => {
    countTotalFoldersForUserMock.mockResolvedValueOnce(3);
    insertReturningMock.mockResolvedValueOnce([{ id: "folder-1" }]);

    const { createFolderForUser } = await import(
      "@/features/folders/mutations"
    );

    const result = await createFolderForUser("user-1", {
      name: "  History  ",
    });

    expect(result).toEqual({ success: true, folderId: "folder-1" });
    expect(insertValuesMock).toHaveBeenCalledWith({
      userId: "user-1",
      name: "History",
      parentFolderId: null,
    });
  });

  it("nests a subfolder under its parent", async () => {
    countTotalFoldersForUserMock.mockResolvedValueOnce(3);
    countChildFoldersForUserMock.mockResolvedValueOnce(0);
    getFolderTreeRecordForUserMock.mockResolvedValueOnce({
      id: "parent-1",
      parentFolderId: null,
      name: "Root",
    });
    getFolderDepthForUserMock.mockResolvedValueOnce(1);
    insertReturningMock.mockResolvedValueOnce([{ id: "child-1" }]);

    const { createFolderForUser } = await import(
      "@/features/folders/mutations"
    );

    const result = await createFolderForUser("user-1", {
      name: "Chapter 1",
      parentFolderId: "parent-1",
    });

    expect(result).toEqual({ success: true, folderId: "child-1" });
    expect(insertValuesMock).toHaveBeenCalledWith({
      userId: "user-1",
      name: "Chapter 1",
      parentFolderId: "parent-1",
    });
  });

  it("creates a nested path relative to an explicitly selected parent", async () => {
    getAllFoldersWithPathsForUserMock.mockResolvedValueOnce([
      { id: "school-1", path: "School" },
      { id: "term-root", path: "Term" },
    ]);
    countTotalFoldersForUserMock.mockResolvedValueOnce(3);
    countChildFoldersForUserMock.mockResolvedValueOnce(0);
    getFolderTreeRecordForUserMock.mockResolvedValueOnce({
      id: "school-1",
      parentFolderId: null,
      name: "School",
    });
    getFolderDepthForUserMock.mockResolvedValueOnce(1);
    insertReturningMock
      .mockResolvedValueOnce([{ id: "term-1" }])
      .mockResolvedValueOnce([{ id: "week-1" }]);

    const { createFolderForUser } = await import(
      "@/features/folders/mutations"
    );

    const result = await createFolderForUser("user-1", {
      name: "Term::Week 1",
      parentFolderId: "school-1",
    });

    expect(result).toEqual({ success: true, folderId: "week-1" });
    expect(insertValuesMock).toHaveBeenNthCalledWith(1, {
      userId: "user-1",
      name: "Term",
      parentFolderId: "school-1",
    });
    expect(insertValuesMock).toHaveBeenNthCalledWith(2, {
      userId: "user-1",
      name: "Week 1",
      parentFolderId: "term-1",
    });
  });

  it("creates a child folder from a :: path", async () => {
    getAllFoldersWithPathsForUserMock.mockResolvedValueOnce([
      { id: "parent-1", path: "Root" },
    ]);
    countTotalFoldersForUserMock.mockResolvedValueOnce(3);
    countChildFoldersForUserMock.mockResolvedValueOnce(0);
    getFolderTreeRecordForUserMock.mockResolvedValueOnce({
      id: "parent-1",
      parentFolderId: null,
      name: "Root",
    });
    getFolderDepthForUserMock.mockResolvedValueOnce(1);
    insertReturningMock.mockResolvedValueOnce([{ id: "child-1" }]);

    const { createFolderForUser } = await import(
      "@/features/folders/mutations"
    );

    const result = await createFolderForUser("user-1", {
      name: "Root:: Chapter 1 ",
    });

    expect(result).toEqual({ success: true, folderId: "child-1" });
    expect(insertValuesMock).toHaveBeenCalledWith({
      userId: "user-1",
      name: "Chapter 1",
      parentFolderId: "parent-1",
    });
    expect(transactionMock).toHaveBeenCalledOnce();
  });

  it("creates every folder from a missing :: path", async () => {
    getAllFoldersWithPathsForUserMock.mockResolvedValueOnce([]);
    countTotalFoldersForUserMock.mockResolvedValueOnce(3);
    insertReturningMock
      .mockResolvedValueOnce([{ id: "math-1" }])
      .mockResolvedValueOnce([{ id: "calculus-1" }])
      .mockResolvedValueOnce([{ id: "integrals-1" }]);

    const { createFolderForUser } = await import(
      "@/features/folders/mutations"
    );

    const result = await createFolderForUser("user-1", {
      name: "Math::Calculus::Integrals",
    });

    expect(result).toEqual({ success: true, folderId: "integrals-1" });
    expect(insertValuesMock).toHaveBeenNthCalledWith(1, {
      userId: "user-1",
      name: "Math",
      parentFolderId: null,
    });
    expect(insertValuesMock).toHaveBeenNthCalledWith(2, {
      userId: "user-1",
      name: "Calculus",
      parentFolderId: "math-1",
    });
    expect(insertValuesMock).toHaveBeenNthCalledWith(3, {
      userId: "user-1",
      name: "Integrals",
      parentFolderId: "calculus-1",
    });
  });

  it("maps a path-segment collision from the atomic transaction", async () => {
    getAllFoldersWithPathsForUserMock.mockResolvedValueOnce([]);
    countTotalFoldersForUserMock.mockResolvedValueOnce(3);
    insertReturningMock
      .mockResolvedValueOnce([{ id: "math-1" }])
      .mockRejectedValueOnce({ code: "23505" });

    const { createFolderForUser } = await import(
      "@/features/folders/mutations"
    );

    const result = await createFolderForUser("user-1", {
      name: "Math::Calculus",
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: "folders.duplicateName",
    });
    expect(transactionMock).toHaveBeenCalledOnce();
    expect(insertMock).toHaveBeenCalledTimes(2);
  });

  it("creates only missing folders from a partially existing :: path", async () => {
    getAllFoldersWithPathsForUserMock.mockResolvedValueOnce([
      { id: "math-1", path: "Math" },
    ]);
    countTotalFoldersForUserMock.mockResolvedValueOnce(3);
    countChildFoldersForUserMock.mockResolvedValueOnce(0);
    getFolderTreeRecordForUserMock.mockResolvedValueOnce({
      id: "math-1",
      parentFolderId: null,
      name: "Math",
    });
    getFolderDepthForUserMock.mockResolvedValueOnce(1);
    insertReturningMock
      .mockResolvedValueOnce([{ id: "calculus-1" }])
      .mockResolvedValueOnce([{ id: "integrals-1" }]);

    const { createFolderForUser } = await import(
      "@/features/folders/mutations"
    );

    const result = await createFolderForUser("user-1", {
      name: "Math::Calculus::Integrals",
    });

    expect(result).toEqual({ success: true, folderId: "integrals-1" });
    expect(insertValuesMock).toHaveBeenNthCalledWith(1, {
      userId: "user-1",
      name: "Calculus",
      parentFolderId: "math-1",
    });
    expect(insertValuesMock).toHaveBeenNthCalledWith(2, {
      userId: "user-1",
      name: "Integrals",
      parentFolderId: "calculus-1",
    });
  });

  it("returns duplicateName when the full :: path exists", async () => {
    getAllFoldersWithPathsForUserMock.mockResolvedValueOnce([
      { id: "integrals-1", path: "Math::Calculus::Integrals" },
    ]);

    const { createFolderForUser } = await import(
      "@/features/folders/mutations"
    );

    const result = await createFolderForUser("user-1", {
      name: "Math::Calculus::Integrals",
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: "folders.duplicateName",
    });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("rejects nesting past the depth cap", async () => {
    const { LIMITS } = await import("@/lib/config/limits");
    countTotalFoldersForUserMock.mockResolvedValueOnce(3);
    countChildFoldersForUserMock.mockResolvedValueOnce(0);
    getFolderTreeRecordForUserMock.mockResolvedValueOnce({
      id: "parent-1",
      parentFolderId: null,
      name: "Root",
    });
    getFolderDepthForUserMock.mockResolvedValueOnce(
      LIMITS.maxFolderNestingDepth,
    );

    const { createFolderForUser } = await import(
      "@/features/folders/mutations"
    );

    const result = await createFolderForUser("user-1", {
      name: "Too deep",
      parentFolderId: "parent-1",
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: "limits.folderNestingDepthLimit",
    });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("rejects nesting past the child-count cap", async () => {
    const { LIMITS } = await import("@/lib/config/limits");
    countTotalFoldersForUserMock.mockResolvedValueOnce(3);
    countChildFoldersForUserMock.mockResolvedValueOnce(
      LIMITS.maxChildFoldersPerFolder,
    );
    getFolderTreeRecordForUserMock.mockResolvedValueOnce({
      id: "parent-1",
      parentFolderId: null,
      name: "Root",
    });
    getFolderDepthForUserMock.mockResolvedValueOnce(1);

    const { createFolderForUser } = await import(
      "@/features/folders/mutations"
    );

    const result = await createFolderForUser("user-1", {
      name: "One too many",
      parentFolderId: "parent-1",
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: "limits.childFolderLimit",
    });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("returns notFound when the parent does not exist", async () => {
    countTotalFoldersForUserMock.mockResolvedValueOnce(3);
    countChildFoldersForUserMock.mockResolvedValueOnce(0);
    getFolderTreeRecordForUserMock.mockResolvedValueOnce(null);
    getFolderDepthForUserMock.mockResolvedValueOnce(null);

    const { createFolderForUser } = await import(
      "@/features/folders/mutations"
    );

    const result = await createFolderForUser("user-1", {
      name: "Orphan",
      parentFolderId: "missing",
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: "folders.notFound",
    });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("returns the duplicate name error on a unique constraint violation", async () => {
    countTotalFoldersForUserMock.mockResolvedValueOnce(3);
    insertReturningMock.mockRejectedValueOnce({ code: "23505" });

    const { createFolderForUser } = await import(
      "@/features/folders/mutations"
    );

    const result = await createFolderForUser("user-1", {
      name: "History",
    });

    expect(result).toEqual({
      success: false,
      errorCode: "folders.duplicateName",
      errorParams: undefined,
      errorMessage: undefined,
    });
  });

  it("rethrows non-unique-violation insert errors", async () => {
    countTotalFoldersForUserMock.mockResolvedValueOnce(3);
    const unexpected = new Error("connection lost");
    insertReturningMock.mockRejectedValueOnce(unexpected);

    const { createFolderForUser } = await import(
      "@/features/folders/mutations"
    );

    await expect(
      createFolderForUser("user-1", { name: "History" }),
    ).rejects.toThrow(unexpected);
  });
});

describe("editFolderForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the duplicate name error on a unique constraint violation", async () => {
    getFolderRecordForUserMock.mockResolvedValueOnce({
      id: "folder-1",
    });
    updateWhereMock.mockRejectedValueOnce({ code: "23505" });

    const { editFolderForUser } = await import("@/features/folders/mutations");

    const result = await editFolderForUser("user-1", {
      id: "folder-1",
      name: "History",
    });

    expect(result).toEqual({
      success: false,
      errorCode: "folders.duplicateName",
      errorParams: undefined,
      errorMessage: undefined,
    });
  });
});

describe("deleteFolderForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns notFound when the folder is inaccessible", async () => {
    getFolderRecordForUserMock.mockResolvedValueOnce(null);

    const { deleteFolderForUser } = await import(
      "@/features/folders/mutations"
    );

    const result = await deleteFolderForUser("user-1", { id: "folder-1" });

    expect(result).toEqual({
      success: false,
      errorCode: "folders.notFound",
      errorParams: undefined,
      errorMessage: undefined,
    });
    expect(deleteMock).not.toHaveBeenCalled();
  });
});
