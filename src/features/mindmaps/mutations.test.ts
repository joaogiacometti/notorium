import { beforeEach, describe, expect, it, vi } from "vitest";

const insertValuesMock = vi.fn();
const insertMock = vi.fn(() => ({ values: insertValuesMock }));
const updateWhereMock = vi.fn();
const updateSetMock = vi.fn(() => ({ where: updateWhereMock }));
const updateMock = vi.fn(() => ({ set: updateSetMock }));
const deleteWhereMock = vi.fn();
const deleteMock = vi.fn(() => ({ where: deleteWhereMock }));
interface TransactionMock {
  insert: typeof insertMock;
  update: typeof updateMock;
  delete: typeof deleteMock;
}
const transactionMock = vi.fn(
  async (callback: (tx: TransactionMock) => unknown) =>
    callback({ insert: insertMock, update: updateMock, delete: deleteMock }),
);
const andMock = vi.fn((...conditions) => conditions);
const eqMock = vi.fn((column, value) => ({ column, value }));
const countMindmapsBySubjectForUserMock = vi.fn();
const getMindmapByIdForUserMock = vi.fn();
const getSubjectRecordForUserMock = vi.fn();
const cleanupAttachmentPathnamesMock = vi.fn();

vi.mock("@/db/index", () => ({
  getDb: () => ({
    insert: insertMock,
    update: updateMock,
    delete: deleteMock,
    transaction: transactionMock,
  }),
}));

vi.mock("drizzle-orm", () => ({ and: andMock, eq: eqMock }));

vi.mock("@/db/schema", () => ({
  mindmap: { id: "mindmap_id_column", userId: "mindmap_user_id_column" },
}));

vi.mock("@/features/mindmaps/queries", () => ({
  countMindmapsBySubjectForUser: countMindmapsBySubjectForUserMock,
  getMindmapByIdForUser: getMindmapByIdForUserMock,
}));

vi.mock("@/features/subjects/queries", () => ({
  getSubjectRecordForUser: getSubjectRecordForUserMock,
}));

vi.mock("@/features/attachments/cleanup", () => ({
  cleanupAttachmentPathnames: cleanupAttachmentPathnamesMock,
}));

describe("createMindmapForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a mindmap with an empty graph in the subject", async () => {
    const randomUUIDSpy = vi
      .spyOn(crypto, "randomUUID")
      .mockReturnValue("mindmap-new");
    getSubjectRecordForUserMock.mockResolvedValueOnce({
      id: "subject-1",
    });
    countMindmapsBySubjectForUserMock.mockResolvedValueOnce(0);

    const { createMindmapForUser } = await import(
      "@/features/mindmaps/mutations"
    );

    const result = await createMindmapForUser("user-1", {
      title: "Biology",
      subjectId: "subject-1",
    });

    expect(result).toEqual({
      success: true,
      mindmapId: "mindmap-new",
      subjectId: "subject-1",
    });
    expect(insertValuesMock).toHaveBeenCalledWith({
      id: "mindmap-new",
      title: "Biology",
      data: null,
      subjectId: "subject-1",
      userId: "user-1",
    });

    randomUUIDSpy.mockRestore();
  });

  it("rejects creation for a subject the user does not own", async () => {
    getSubjectRecordForUserMock.mockResolvedValueOnce(null);
    countMindmapsBySubjectForUserMock.mockResolvedValueOnce(0);

    const { createMindmapForUser } = await import(
      "@/features/mindmaps/mutations"
    );

    const result = await createMindmapForUser("user-1", {
      title: "Biology",
      subjectId: "subject-1",
    });

    expect(result).toEqual({ success: false, errorCode: "subjects.notFound" });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("rejects creation when the per-subject limit is reached", async () => {
    getSubjectRecordForUserMock.mockResolvedValueOnce({
      id: "subject-1",
    });
    countMindmapsBySubjectForUserMock.mockResolvedValueOnce(100);

    const { createMindmapForUser } = await import(
      "@/features/mindmaps/mutations"
    );

    const result = await createMindmapForUser("user-1", {
      title: "Biology",
      subjectId: "subject-1",
    });

    expect(result.success).toBe(false);
    expect(insertMock).not.toHaveBeenCalled();
  });
});

describe("editMindmapForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates an owned mindmap and returns its subject", async () => {
    getMindmapByIdForUserMock.mockResolvedValueOnce({
      id: "mindmap-1",
      subjectId: "subject-1",
      data: null,
    });

    const { editMindmapForUser } = await import(
      "@/features/mindmaps/mutations"
    );

    const result = await editMindmapForUser("user-1", {
      id: "mindmap-1",
      title: "Updated",
      data: '{"nodes":[],"edges":[]}',
    });

    expect(result).toEqual({
      success: true,
      mindmapId: "mindmap-1",
      subjectId: "subject-1",
    });
    expect(updateSetMock).toHaveBeenCalledWith({
      title: "Updated",
      data: '{"nodes":[],"edges":[]}',
    });
  });

  it("returns not found for a mindmap the user does not own", async () => {
    getMindmapByIdForUserMock.mockResolvedValueOnce(null);

    const { editMindmapForUser } = await import(
      "@/features/mindmaps/mutations"
    );

    const result = await editMindmapForUser("user-1", {
      id: "mindmap-1",
      title: "Updated",
      data: '{"nodes":[],"edges":[]}',
    });

    expect(result).toEqual({ success: false, errorCode: "mindmaps.notFound" });
    expect(updateMock).not.toHaveBeenCalled();
  });
});

describe("splitMindmapForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a new mindmap from a subtree and removes it from the original", async () => {
    const randomUUIDSpy = vi
      .spyOn(crypto, "randomUUID")
      .mockReturnValue("mindmap-split");
    getMindmapByIdForUserMock.mockResolvedValueOnce({
      id: "mindmap-1",
      subjectId: "subject-1",
      data: null,
    });
    countMindmapsBySubjectForUserMock.mockResolvedValueOnce(0);

    const { splitMindmapForUser } = await import(
      "@/features/mindmaps/mutations"
    );

    const data = JSON.stringify({
      nodes: [
        {
          id: "root",
          position: { x: 0, y: 0 },
          data: { label: "Original", kind: "root" },
        },
        { id: "a", position: { x: 200, y: 0 }, data: { label: "Branch" } },
      ],
      edges: [{ id: "root-a", source: "root", target: "a" }],
    });

    const result = await splitMindmapForUser("user-1", {
      id: "mindmap-1",
      nodeId: "a",
      data,
    });

    expect(result).toEqual({
      success: true,
      mindmapId: "mindmap-split",
      subjectId: "subject-1",
    });
    expect(insertValuesMock).toHaveBeenCalledWith({
      id: "mindmap-split",
      title: "Branch",
      data: JSON.stringify({
        nodes: [
          {
            id: "root",
            position: { x: 0, y: 0 },
            data: { label: "Branch", kind: "root" },
          },
        ],
        edges: [],
      }),
      subjectId: "subject-1",
      userId: "user-1",
    });
    expect(updateSetMock).toHaveBeenCalledWith({
      data: JSON.stringify({
        nodes: [
          {
            id: "root",
            position: { x: 0, y: 0 },
            data: { label: "Original", kind: "root" },
          },
        ],
        edges: [],
      }),
    });

    randomUUIDSpy.mockRestore();
  });
});

describe("deleteMindmapForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes an owned mindmap and returns its subject", async () => {
    getMindmapByIdForUserMock.mockResolvedValueOnce({
      id: "mindmap-1",
      subjectId: "subject-1",
      data: null,
    });

    const { deleteMindmapForUser } = await import(
      "@/features/mindmaps/mutations"
    );

    const result = await deleteMindmapForUser("user-1", { id: "mindmap-1" });

    expect(result).toEqual({
      success: true,
      mindmapId: "mindmap-1",
      subjectId: "subject-1",
    });
    expect(deleteMock).toHaveBeenCalled();
  });

  it("returns not found when the mindmap is missing", async () => {
    getMindmapByIdForUserMock.mockResolvedValueOnce(null);

    const { deleteMindmapForUser } = await import(
      "@/features/mindmaps/mutations"
    );

    const result = await deleteMindmapForUser("user-1", { id: "mindmap-1" });

    expect(result).toEqual({ success: false, errorCode: "mindmaps.notFound" });
    expect(deleteMock).not.toHaveBeenCalled();
  });
});

describe("editMindmapTitleForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates only the title of an owned mindmap", async () => {
    getMindmapByIdForUserMock.mockResolvedValueOnce({
      id: "mindmap-1",
      subjectId: "subject-1",
      data: '{"nodes":[],"edges":[]}',
    });

    const { editMindmapTitleForUser } = await import(
      "@/features/mindmaps/mutations"
    );

    const result = await editMindmapTitleForUser("user-1", {
      id: "mindmap-1",
      title: "Renamed",
    });

    expect(result).toEqual({
      success: true,
      mindmapId: "mindmap-1",
      subjectId: "subject-1",
    });
    expect(updateSetMock).toHaveBeenCalledWith({ title: "Renamed" });
    expect(cleanupAttachmentPathnamesMock).not.toHaveBeenCalled();
  });

  it("returns not found for a mindmap the user does not own", async () => {
    getMindmapByIdForUserMock.mockResolvedValueOnce(null);

    const { editMindmapTitleForUser } = await import(
      "@/features/mindmaps/mutations"
    );

    const result = await editMindmapTitleForUser("user-1", {
      id: "mindmap-1",
      title: "Renamed",
    });

    expect(result).toEqual({ success: false, errorCode: "mindmaps.notFound" });
    expect(updateMock).not.toHaveBeenCalled();
  });
});

describe("moveMindmapForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reparents the mindmap to the target subject", async () => {
    getMindmapByIdForUserMock.mockResolvedValueOnce({
      id: "mindmap-1",
      subjectId: "subject-1",
    });
    getSubjectRecordForUserMock.mockResolvedValueOnce({ id: "subject-2" });
    countMindmapsBySubjectForUserMock.mockResolvedValueOnce(0);

    const { moveMindmapForUser } = await import(
      "@/features/mindmaps/mutations"
    );

    const result = await moveMindmapForUser("user-1", {
      id: "mindmap-1",
      subjectId: "subject-2",
    });

    expect(result).toEqual({
      success: true,
      subjectId: "subject-2",
      previousSubjectId: "subject-1",
    });
    expect(updateSetMock).toHaveBeenCalledWith({ subjectId: "subject-2" });
  });

  it("is a no-op when the target subject is unchanged", async () => {
    getMindmapByIdForUserMock.mockResolvedValueOnce({
      id: "mindmap-1",
      subjectId: "subject-1",
    });

    const { moveMindmapForUser } = await import(
      "@/features/mindmaps/mutations"
    );

    const result = await moveMindmapForUser("user-1", {
      id: "mindmap-1",
      subjectId: "subject-1",
    });

    expect(result).toEqual({
      success: true,
      subjectId: "subject-1",
      previousSubjectId: "subject-1",
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("returns not found for a mindmap the user does not own", async () => {
    getMindmapByIdForUserMock.mockResolvedValueOnce(null);

    const { moveMindmapForUser } = await import(
      "@/features/mindmaps/mutations"
    );

    const result = await moveMindmapForUser("user-1", {
      id: "missing",
      subjectId: "subject-2",
    });

    expect(result).toEqual({ success: false, errorCode: "mindmaps.notFound" });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects a move to a subject the user does not own", async () => {
    getMindmapByIdForUserMock.mockResolvedValueOnce({
      id: "mindmap-1",
      subjectId: "subject-1",
    });
    getSubjectRecordForUserMock.mockResolvedValueOnce(null);

    const { moveMindmapForUser } = await import(
      "@/features/mindmaps/mutations"
    );

    const result = await moveMindmapForUser("user-1", {
      id: "mindmap-1",
      subjectId: "subject-foreign",
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: "subjects.notFound",
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects a move when the target subject is at its mindmap limit", async () => {
    getMindmapByIdForUserMock.mockResolvedValueOnce({
      id: "mindmap-1",
      subjectId: "subject-1",
    });
    getSubjectRecordForUserMock.mockResolvedValueOnce({ id: "subject-2" });
    countMindmapsBySubjectForUserMock.mockResolvedValueOnce(100);

    const { moveMindmapForUser } = await import(
      "@/features/mindmaps/mutations"
    );

    const result = await moveMindmapForUser("user-1", {
      id: "mindmap-1",
      subjectId: "subject-2",
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: "limits.mindmapLimit",
    });
    expect(updateMock).not.toHaveBeenCalled();
  });
});
