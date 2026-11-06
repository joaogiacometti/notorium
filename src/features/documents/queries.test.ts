import { beforeEach, describe, expect, it, vi } from "vitest";

const getNotesByFolderForUserMock = vi.fn();
const getRecentNotesForUserMock = vi.fn();

const getPdfsByFolderForUserMock = vi.fn();
const getRecentPdfsForUserMock = vi.fn();

vi.mock("@/features/notes/queries", () => ({
  getNotesByFolderForUser: getNotesByFolderForUserMock,
  getRecentNotesForUser: getRecentNotesForUserMock,
}));

vi.mock("@/features/pdfs/queries", () => ({
  getPdfsByFolderForUser: getPdfsByFolderForUserMock,
  getRecentPdfsForUser: getRecentPdfsForUserMock,
}));

describe("document queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPdfsByFolderForUserMock.mockResolvedValue([]);
    getRecentPdfsForUserMock.mockResolvedValue([]);
  });

  it("lists a folder's notes in recency order", async () => {
    getNotesByFolderForUserMock.mockResolvedValueOnce([
      {
        id: "older",
        title: "Older",
        folderId: "folder",
        updatedAt: new Date("2026-04-19"),
      },
      {
        id: "newer",
        title: "Newer",
        folderId: "folder",
        updatedAt: new Date("2026-04-21"),
      },
    ]);
    const { getFolderDocumentsForUser } = await import(
      "@/features/documents/queries"
    );

    const documents = await getFolderDocumentsForUser("user", "folder");

    expect(documents.map(({ id, kind }) => ({ id, kind }))).toEqual([
      { id: "newer", kind: "note" },
      { id: "older", kind: "note" },
    ]);
    expect(getNotesByFolderForUserMock).toHaveBeenCalledWith("user", "folder");
  });

  it("limits recent notes across folders", async () => {
    getRecentNotesForUserMock.mockResolvedValueOnce([
      {
        id: "old",
        title: "Old",
        folderId: "one",
        updatedAt: new Date("2026-04-18"),
      },
      {
        id: "new",
        title: "New",
        folderId: "two",
        updatedAt: new Date("2026-04-22"),
      },
    ]);
    const { getRecentDocumentsForUser } = await import(
      "@/features/documents/queries"
    );

    const documents = await getRecentDocumentsForUser("user", 1);

    expect(documents.map(({ id, kind }) => ({ id, kind }))).toEqual([
      { id: "new", kind: "note" },
    ]);
    expect(getRecentNotesForUserMock).toHaveBeenCalledWith("user", 1);
  });

  it("interleaves notes and PDFs by recency", async () => {
    getNotesByFolderForUserMock.mockResolvedValueOnce([
      {
        id: "note",
        title: "Note",
        folderId: "folder",
        updatedAt: new Date("2026-04-19"),
      },
    ]);
    getPdfsByFolderForUserMock.mockResolvedValueOnce([
      {
        id: "pdf",
        title: "Book",
        folderId: "folder",
        updatedAt: new Date("2026-04-20"),
      },
    ]);
    const { getFolderDocumentsForUser } = await import(
      "@/features/documents/queries"
    );

    const documents = await getFolderDocumentsForUser("user", "folder");

    expect(documents.map(({ id, kind }) => ({ id, kind }))).toEqual([
      { id: "pdf", kind: "pdf" },
      { id: "note", kind: "note" },
    ]);
  });
});
