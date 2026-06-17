import { beforeEach, describe, expect, it, vi } from "vitest";

const getNotesBySubjectForUserMock = vi.fn();
const getMindmapsBySubjectForUserMock = vi.fn();
const getRecentNotesForUserMock = vi.fn();
const getRecentMindmapsForUserMock = vi.fn();

vi.mock("@/features/notes/queries", () => ({
  getNotesBySubjectForUser: getNotesBySubjectForUserMock,
  getRecentNotesForUser: getRecentNotesForUserMock,
}));

vi.mock("@/features/mindmaps/queries", () => ({
  getMindmapsBySubjectForUser: getMindmapsBySubjectForUserMock,
  getRecentMindmapsForUser: getRecentMindmapsForUserMock,
}));

describe("getSubjectDocumentsForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("merges notes and mindmaps ordered by most recent update", async () => {
    getNotesBySubjectForUserMock.mockResolvedValueOnce([
      {
        id: "note-1",
        title: "Older note",
        subjectId: "subject-1",
        content: null,
        userId: "user-1",
        createdAt: new Date("2026-04-19T10:00:00.000Z"),
        updatedAt: new Date("2026-04-19T10:00:00.000Z"),
      },
    ]);
    getMindmapsBySubjectForUserMock.mockResolvedValueOnce([
      {
        id: "mindmap-1",
        title: "Newer mindmap",
        updatedAt: new Date("2026-04-21T10:00:00.000Z"),
      },
    ]);

    const { getSubjectDocumentsForUser } = await import(
      "@/features/documents/queries"
    );

    const result = await getSubjectDocumentsForUser("user-1", "subject-1");

    expect(result).toEqual([
      {
        id: "mindmap-1",
        title: "Newer mindmap",
        updatedAt: new Date("2026-04-21T10:00:00.000Z"),
        kind: "mindmap",
        subjectId: "subject-1",
      },
      {
        id: "note-1",
        title: "Older note",
        updatedAt: new Date("2026-04-19T10:00:00.000Z"),
        kind: "note",
        subjectId: "subject-1",
      },
    ]);
  });

  it("returns an empty list when the subject has no documents", async () => {
    getNotesBySubjectForUserMock.mockResolvedValueOnce([]);
    getMindmapsBySubjectForUserMock.mockResolvedValueOnce([]);

    const { getSubjectDocumentsForUser } = await import(
      "@/features/documents/queries"
    );

    expect(await getSubjectDocumentsForUser("user-1", "subject-1")).toEqual([]);
  });
});

describe("getRecentDocumentsForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("merges recent notes and mindmaps across subjects ordered by recency", async () => {
    getRecentNotesForUserMock.mockResolvedValueOnce([
      {
        id: "note-1",
        title: "Older note",
        updatedAt: new Date("2026-04-19T10:00:00.000Z"),
        subjectId: "subject-1",
      },
    ]);
    getRecentMindmapsForUserMock.mockResolvedValueOnce([
      {
        id: "mindmap-1",
        title: "Newer mindmap",
        updatedAt: new Date("2026-04-21T10:00:00.000Z"),
        subjectId: "subject-2",
      },
    ]);

    const { getRecentDocumentsForUser } = await import(
      "@/features/documents/queries"
    );

    expect(await getRecentDocumentsForUser("user-1", 5)).toEqual([
      {
        id: "mindmap-1",
        title: "Newer mindmap",
        updatedAt: new Date("2026-04-21T10:00:00.000Z"),
        kind: "mindmap",
        subjectId: "subject-2",
      },
      {
        id: "note-1",
        title: "Older note",
        updatedAt: new Date("2026-04-19T10:00:00.000Z"),
        kind: "note",
        subjectId: "subject-1",
      },
    ]);
  });

  it("slices the merged list down to the requested limit", async () => {
    getRecentNotesForUserMock.mockResolvedValueOnce([
      {
        id: "note-1",
        title: "Newest",
        updatedAt: new Date("2026-04-22T10:00:00.000Z"),
        subjectId: "subject-1",
      },
      {
        id: "note-2",
        title: "Oldest",
        updatedAt: new Date("2026-04-18T10:00:00.000Z"),
        subjectId: "subject-1",
      },
    ]);
    getRecentMindmapsForUserMock.mockResolvedValueOnce([
      {
        id: "mindmap-1",
        title: "Middle",
        updatedAt: new Date("2026-04-20T10:00:00.000Z"),
        subjectId: "subject-2",
      },
    ]);

    const { getRecentDocumentsForUser } = await import(
      "@/features/documents/queries"
    );

    const result = await getRecentDocumentsForUser("user-1", 2);

    expect(result.map((item) => item.id)).toEqual(["note-1", "mindmap-1"]);
  });
});
