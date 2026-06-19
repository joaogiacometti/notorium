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
const getSubjectRecordForUserMock = vi.fn();
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
  getSubjectRecordForUser: getSubjectRecordForUserMock,
}));

vi.mock("@/features/notes/queries", () => ({
  countNotesBySubjectForUser: countNotesBySubjectForUserMock,
  getNoteByIdForUser: getNoteByIdForUserMock,
}));

vi.mock("@/lib/media-storage/provider", () => ({
  getMediaStorageProvider: getMediaStorageProviderMock,
}));

describe("createNoteForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the created note id", async () => {
    const randomUUIDSpy = vi
      .spyOn(crypto, "randomUUID")
      .mockReturnValue("note-new");
    getSubjectRecordForUserMock.mockResolvedValueOnce({
      id: "subject-1",
    });
    countNotesBySubjectForUserMock.mockResolvedValueOnce(0);

    const { createNoteForUser } = await import("@/features/notes/mutations");

    const result = await createNoteForUser("user-1", {
      subjectId: "subject-1",
      title: "New note",
      content: "",
    });

    expect(result).toEqual({
      success: true,
      subjectId: "subject-1",
      noteId: "note-new",
    });
    expect(insertValuesMock).toHaveBeenCalledWith({
      id: "note-new",
      subjectId: "subject-1",
      userId: "user-1",
      title: "New note",
      content: "",
    });

    randomUUIDSpy.mockRestore();
  });
});

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

describe("moveNoteForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reparents the note to the target subject", async () => {
    getNoteByIdForUserMock.mockResolvedValueOnce({
      id: "note-1",
      subjectId: "subject-1",
    });
    getSubjectRecordForUserMock.mockResolvedValueOnce({ id: "subject-2" });
    countNotesBySubjectForUserMock.mockResolvedValueOnce(0);

    const { moveNoteForUser } = await import("@/features/notes/mutations");

    const result = await moveNoteForUser("user-1", {
      id: "note-1",
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
    getNoteByIdForUserMock.mockResolvedValueOnce({
      id: "note-1",
      subjectId: "subject-1",
    });

    const { moveNoteForUser } = await import("@/features/notes/mutations");

    const result = await moveNoteForUser("user-1", {
      id: "note-1",
      subjectId: "subject-1",
    });

    expect(result).toEqual({
      success: true,
      subjectId: "subject-1",
      previousSubjectId: "subject-1",
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("returns notFound when the note is missing", async () => {
    getNoteByIdForUserMock.mockResolvedValueOnce(null);

    const { moveNoteForUser } = await import("@/features/notes/mutations");

    const result = await moveNoteForUser("user-1", {
      id: "missing",
      subjectId: "subject-2",
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: "notes.notFound",
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects a move to a subject the user does not own", async () => {
    getNoteByIdForUserMock.mockResolvedValueOnce({
      id: "note-1",
      subjectId: "subject-1",
    });
    getSubjectRecordForUserMock.mockResolvedValueOnce(null);

    const { moveNoteForUser } = await import("@/features/notes/mutations");

    const result = await moveNoteForUser("user-1", {
      id: "note-1",
      subjectId: "subject-foreign",
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: "subjects.notFound",
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects a move when the target subject is at its note limit", async () => {
    getNoteByIdForUserMock.mockResolvedValueOnce({
      id: "note-1",
      subjectId: "subject-1",
    });
    getSubjectRecordForUserMock.mockResolvedValueOnce({ id: "subject-2" });
    countNotesBySubjectForUserMock.mockResolvedValueOnce(1000);

    const { moveNoteForUser } = await import("@/features/notes/mutations");

    const result = await moveNoteForUser("user-1", {
      id: "note-1",
      subjectId: "subject-2",
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: "limits.noteLimit",
    });
    expect(updateMock).not.toHaveBeenCalled();
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
