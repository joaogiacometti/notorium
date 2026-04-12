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
const getActiveSubjectRecordForUserMock = vi.fn();
const countNotesBySubjectForUserMock = vi.fn();
const getNoteByIdForUserMock = vi.fn();
const getMediaStorageProviderMock = vi.fn();
const deleteImagesMock = vi.fn();

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
  note: {
    id: "note_id_column",
    userId: "note_user_id_column",
  },
}));

vi.mock("@/features/subjects/queries", () => ({
  getActiveSubjectRecordForUser: getActiveSubjectRecordForUserMock,
}));

vi.mock("@/features/notes/queries", () => ({
  countNotesBySubjectForUser: countNotesBySubjectForUserMock,
  getNoteByIdForUser: getNoteByIdForUserMock,
}));

vi.mock("@/lib/media-storage/provider", () => ({
  getMediaStorageProvider: getMediaStorageProviderMock,
}));

describe("editNoteForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMediaStorageProviderMock.mockResolvedValue({
      deleteImages: deleteImagesMock,
    });
  });

  it("deletes removed attachment blobs after updating note content", async () => {
    getNoteByIdForUserMock.mockResolvedValueOnce({
      id: "note-1",
      subjectId: "subject-1",
      content:
        '<p><img src="/api/attachments/blob?pathname=notorium%2Fnotes%2Fuser-1%2Fold.png"></p><p>Keep</p>',
    });

    const { editNoteForUser } = await import("@/features/notes/mutations");

    const result = await editNoteForUser("user-1", {
      id: "note-1",
      title: "Updated",
      content: "<p>Keep</p>",
    });

    expect(result).toEqual({ success: true, subjectId: "subject-1" });
    expect(deleteImagesMock).toHaveBeenCalledWith({
      pathnames: ["notorium/notes/user-1/old.png"],
    });
  });

  it("returns success when attachment cleanup fails after updating", async () => {
    getNoteByIdForUserMock.mockResolvedValueOnce({
      id: "note-1",
      subjectId: "subject-1",
      content:
        '<p><img src="/api/attachments/blob?pathname=notorium%2Fnotes%2Fuser-1%2Fold.png"></p><p>Keep</p>',
    });
    deleteImagesMock.mockRejectedValueOnce(new Error("cleanup failed"));

    const { editNoteForUser } = await import("@/features/notes/mutations");

    const result = await editNoteForUser("user-1", {
      id: "note-1",
      title: "Updated",
      content: "<p>Keep</p>",
    });

    expect(result).toEqual({ success: true, subjectId: "subject-1" });
    expect(updateMock).toHaveBeenCalled();
    expect(deleteImagesMock).toHaveBeenCalledWith({
      pathnames: ["notorium/notes/user-1/old.png"],
    });
  });

  it("only deletes owned attachment blobs after updating note content", async () => {
    getNoteByIdForUserMock.mockResolvedValueOnce({
      id: "note-1",
      subjectId: "subject-1",
      content:
        '<p><img src="/api/attachments/blob?pathname=notorium%2Fnotes%2Fuser-1%2Fold.png"></p><p><img src="/api/attachments/blob?pathname=notorium%2Fnotes%2Fuser-2%2Fforeign.png"></p>',
    });

    const { editNoteForUser } = await import("@/features/notes/mutations");

    const result = await editNoteForUser("user-1", {
      id: "note-1",
      title: "Updated",
      content: "<p>Keep</p>",
    });

    expect(result).toEqual({ success: true, subjectId: "subject-1" });
    expect(deleteImagesMock).toHaveBeenCalledWith({
      pathnames: ["notorium/notes/user-1/old.png"],
    });
  });
});

describe("deleteNoteForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMediaStorageProviderMock.mockResolvedValue({
      deleteImages: deleteImagesMock,
    });
  });

  it("deletes owned attachment blobs after deleting a note", async () => {
    getNoteByIdForUserMock.mockResolvedValueOnce({
      id: "note-1",
      subjectId: "subject-1",
      content:
        "<p>/api/attachments/blob?pathname=notorium%2Fnotes%2Fuser-1%2Fold.png</p>",
    });

    const { deleteNoteForUser } = await import("@/features/notes/mutations");

    const result = await deleteNoteForUser("user-1", {
      id: "note-1",
    });

    expect(result).toEqual({ success: true, subjectId: "subject-1" });
    expect(deleteImagesMock).toHaveBeenCalledWith({
      pathnames: ["notorium/notes/user-1/old.png"],
    });
  });

  it("returns success when attachment cleanup fails after deleting", async () => {
    getNoteByIdForUserMock.mockResolvedValueOnce({
      id: "note-1",
      subjectId: "subject-1",
      content:
        "<p>/api/attachments/blob?pathname=notorium%2Fnotes%2Fuser-1%2Fold.png</p>",
    });
    deleteImagesMock.mockRejectedValueOnce(new Error("cleanup failed"));

    const { deleteNoteForUser } = await import("@/features/notes/mutations");

    const result = await deleteNoteForUser("user-1", {
      id: "note-1",
    });

    expect(result).toEqual({ success: true, subjectId: "subject-1" });
    expect(deleteMock).toHaveBeenCalled();
    expect(deleteImagesMock).toHaveBeenCalledWith({
      pathnames: ["notorium/notes/user-1/old.png"],
    });
  });
});
