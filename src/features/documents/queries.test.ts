import { beforeEach, describe, expect, it, vi } from "vitest";

const getNotesBySubjectForUserMock = vi.fn();
const getRecentNotesForUserMock = vi.fn();

const getPdfsBySubjectForUserMock = vi.fn();
const getRecentPdfsForUserMock = vi.fn();

vi.mock("@/features/notes/queries", () => ({
  getNotesBySubjectForUser: getNotesBySubjectForUserMock,
  getRecentNotesForUser: getRecentNotesForUserMock,
}));

vi.mock("@/features/pdfs/queries", () => ({
  getPdfsBySubjectForUser: getPdfsBySubjectForUserMock,
  getRecentPdfsForUser: getRecentPdfsForUserMock,
}));

describe("document queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPdfsBySubjectForUserMock.mockResolvedValue([]);
    getRecentPdfsForUserMock.mockResolvedValue([]);
  });

  it("lists a subject's notes in recency order", async () => {
    getNotesBySubjectForUserMock.mockResolvedValueOnce([
      {
        id: "older",
        title: "Older",
        subjectId: "subject",
        updatedAt: new Date("2026-04-19"),
      },
      {
        id: "newer",
        title: "Newer",
        subjectId: "subject",
        updatedAt: new Date("2026-04-21"),
      },
    ]);
    const { getSubjectDocumentsForUser } = await import(
      "@/features/documents/queries"
    );

    const documents = await getSubjectDocumentsForUser("user", "subject");

    expect(documents.map(({ id, kind }) => ({ id, kind }))).toEqual([
      { id: "newer", kind: "note" },
      { id: "older", kind: "note" },
    ]);
    expect(getNotesBySubjectForUserMock).toHaveBeenCalledWith(
      "user",
      "subject",
    );
  });

  it("limits recent notes across subjects", async () => {
    getRecentNotesForUserMock.mockResolvedValueOnce([
      {
        id: "old",
        title: "Old",
        subjectId: "one",
        updatedAt: new Date("2026-04-18"),
      },
      {
        id: "new",
        title: "New",
        subjectId: "two",
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
    getNotesBySubjectForUserMock.mockResolvedValueOnce([
      {
        id: "note",
        title: "Note",
        subjectId: "subject",
        updatedAt: new Date("2026-04-19"),
      },
    ]);
    getPdfsBySubjectForUserMock.mockResolvedValueOnce([
      {
        id: "pdf",
        title: "Book",
        subjectId: "subject",
        updatedAt: new Date("2026-04-20"),
      },
    ]);
    const { getSubjectDocumentsForUser } = await import(
      "@/features/documents/queries"
    );

    const documents = await getSubjectDocumentsForUser("user", "subject");

    expect(documents.map(({ id, kind }) => ({ id, kind }))).toEqual([
      { id: "pdf", kind: "pdf" },
      { id: "note", kind: "note" },
    ]);
  });
});
