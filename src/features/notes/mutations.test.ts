import { beforeEach, describe, expect, it, vi } from "vitest";
import { testDocument } from "@/test/document";

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
const getFolderRecordForUserMock = vi.fn();
const countNotesByFolderForUserMock = vi.fn();
const getNoteByIdForUserMock = vi.fn();
const getMediaStorageProviderMock = vi.fn();
const deleteImagesMock = vi.fn();

class SharedImageStorageFake {
  readonly pathnames = new Set(["notorium/notes/user-1/shared.png"]);

  async deleteImages(input: { pathnames: string[] }): Promise<void> {
    for (const pathname of input.pathnames) this.pathnames.delete(pathname);
  }
}

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

vi.mock("@/features/folders/queries", () => ({
  getFolderRecordForUser: getFolderRecordForUserMock,
}));

vi.mock("@/features/notes/queries", () => ({
  countNotesByFolderForUser: countNotesByFolderForUserMock,
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
    getFolderRecordForUserMock.mockResolvedValueOnce({
      id: "folder-1",
    });
    countNotesByFolderForUserMock.mockResolvedValueOnce(0);

    const { createNoteForUser } = await import("@/features/notes/mutations");

    const result = await createNoteForUser("user-1", {
      folderId: "folder-1",
      title: "New note",
      content: testDocument(""),
    });

    expect(result).toEqual({
      success: true,
      folderId: "folder-1",
      noteId: "note-new",
    });
    expect(insertValuesMock).toHaveBeenCalledWith({
      id: "note-new",
      folderId: "folder-1",
      userId: "user-1",
      title: "New note",
      content: testDocument(""),
      contentText: "",
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

  it("preserves an image still referenced by a second saved note", async () => {
    const storage = new SharedImageStorageFake();
    const sharedContent =
      '<p><img src="/api/attachments/blob?pathname=notorium%2Fnotes%2Fuser-1%2Fshared.png"></p>';
    getFolderRecordForUserMock.mockResolvedValueOnce({ id: "folder-1" });
    countNotesByFolderForUserMock.mockResolvedValueOnce(1);
    getNoteByIdForUserMock.mockResolvedValueOnce({
      id: "note-1",
      folderId: "folder-1",
      content: testDocument(sharedContent),
    });
    getMediaStorageProviderMock.mockResolvedValue(storage);
    const { createNoteForUser, editNoteForUser } = await import(
      "@/features/notes/mutations"
    );
    const { createNoteSchema } = await import("@/features/notes/validation");
    const copiedNote = createNoteSchema.parse({
      title: "Copy with shared image",
      folderId: "folder-1",
      content: testDocument(sharedContent),
    });

    expect((await createNoteForUser("user-1", copiedNote)).success).toBe(true);
    expect(insertValuesMock.mock.lastCall?.[0]).toMatchObject(copiedNote);
    const result = await editNoteForUser("user-1", {
      id: "note-1",
      title: "Original without image",
      content: testDocument("<p>Image removed</p>"),
    });

    expect(result.success).toBe(true);
    expect(storage.pathnames.has("notorium/notes/user-1/shared.png")).toBe(
      true,
    );
  });

  it("keeps saved content when a rename omits content", async () => {
    getNoteByIdForUserMock.mockResolvedValueOnce({
      id: "note-1",
      folderId: "folder-1",
      content: testDocument("<p>Keep</p>"),
    });

    const { editNoteForUser } = await import("@/features/notes/mutations");

    const result = await editNoteForUser("user-1", {
      id: "note-1",
      title: "Renamed",
    });

    expect(result).toEqual({ success: true, folderId: "folder-1" });
    expect(updateSetMock).toHaveBeenCalledWith({ title: "Renamed" });
  });

  it("defers removed attachment deletion to the orphan sweep", async () => {
    getNoteByIdForUserMock.mockResolvedValueOnce({
      id: "note-1",
      folderId: "folder-1",
      content: testDocument(
        '<p><img src="/api/attachments/blob?pathname=notorium%2Fnotes%2Fuser-1%2Fold.png"></p><p>Keep</p>',
      ),
    });

    const { editNoteForUser } = await import("@/features/notes/mutations");

    const result = await editNoteForUser("user-1", {
      id: "note-1",
      title: "Updated",
      content: testDocument("<p>Keep</p>"),
    });

    expect(result).toEqual({ success: true, folderId: "folder-1" });
    expect(deleteImagesMock).not.toHaveBeenCalled();
  });

  it("does not eagerly delete owned or foreign images when editing", async () => {
    getNoteByIdForUserMock.mockResolvedValueOnce({
      id: "note-1",
      folderId: "folder-1",
      content: testDocument(
        '<p><img src="/api/attachments/blob?pathname=notorium%2Fnotes%2Fuser-1%2Fold.png"></p><p><img src="/api/attachments/blob?pathname=notorium%2Fnotes%2Fuser-2%2Fforeign.png"></p>',
      ),
    });

    const { editNoteForUser } = await import("@/features/notes/mutations");

    const result = await editNoteForUser("user-1", {
      id: "note-1",
      title: "Updated",
      content: testDocument("<p>Keep</p>"),
    });

    expect(result).toEqual({ success: true, folderId: "folder-1" });
    expect(deleteImagesMock).not.toHaveBeenCalled();
  });
});

describe("moveNoteForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reparents the note to the target folder", async () => {
    getNoteByIdForUserMock.mockResolvedValueOnce({
      id: "note-1",
      folderId: "folder-1",
    });
    getFolderRecordForUserMock.mockResolvedValueOnce({ id: "folder-2" });
    countNotesByFolderForUserMock.mockResolvedValueOnce(0);

    const { moveNoteForUser } = await import("@/features/notes/mutations");

    const result = await moveNoteForUser("user-1", {
      id: "note-1",
      folderId: "folder-2",
    });

    expect(result).toEqual({
      success: true,
      folderId: "folder-2",
      previousFolderId: "folder-1",
    });
    expect(updateSetMock).toHaveBeenCalledWith({ folderId: "folder-2" });
  });

  it("is a no-op when the target folder is unchanged", async () => {
    getNoteByIdForUserMock.mockResolvedValueOnce({
      id: "note-1",
      folderId: "folder-1",
    });

    const { moveNoteForUser } = await import("@/features/notes/mutations");

    const result = await moveNoteForUser("user-1", {
      id: "note-1",
      folderId: "folder-1",
    });

    expect(result).toEqual({
      success: true,
      folderId: "folder-1",
      previousFolderId: "folder-1",
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("returns notFound when the note is missing", async () => {
    getNoteByIdForUserMock.mockResolvedValueOnce(null);

    const { moveNoteForUser } = await import("@/features/notes/mutations");

    const result = await moveNoteForUser("user-1", {
      id: "missing",
      folderId: "folder-2",
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: "notes.notFound",
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects a move to a folder the user does not own", async () => {
    getNoteByIdForUserMock.mockResolvedValueOnce({
      id: "note-1",
      folderId: "folder-1",
    });
    getFolderRecordForUserMock.mockResolvedValueOnce(null);

    const { moveNoteForUser } = await import("@/features/notes/mutations");

    const result = await moveNoteForUser("user-1", {
      id: "note-1",
      folderId: "folder-foreign",
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: "folders.notFound",
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects a move when the target folder is at its note limit", async () => {
    getNoteByIdForUserMock.mockResolvedValueOnce({
      id: "note-1",
      folderId: "folder-1",
    });
    getFolderRecordForUserMock.mockResolvedValueOnce({ id: "folder-2" });
    countNotesByFolderForUserMock.mockResolvedValueOnce(1000);

    const { moveNoteForUser } = await import("@/features/notes/mutations");

    const result = await moveNoteForUser("user-1", {
      id: "note-1",
      folderId: "folder-2",
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

  it("preserves attachment files when deleting a note", async () => {
    getNoteByIdForUserMock.mockResolvedValueOnce({
      id: "note-1",
      folderId: "folder-1",
      content: testDocument(
        "<p>/api/attachments/blob?pathname=notorium%2Fnotes%2Fuser-1%2Fold.png</p>",
      ),
    });

    const { deleteNoteForUser } = await import("@/features/notes/mutations");

    const result = await deleteNoteForUser("user-1", {
      id: "note-1",
    });

    expect(result).toEqual({ success: true, folderId: "folder-1" });
    expect(deleteImagesMock).not.toHaveBeenCalled();
  });
});
