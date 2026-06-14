import { beforeEach, describe, expect, it, vi } from "vitest";

const getNotesBySubjectForUserMock = vi.fn();
const getMindmapsBySubjectForUserMock = vi.fn();

vi.mock("@/features/notes/queries", () => ({
  getNotesBySubjectForUser: getNotesBySubjectForUserMock,
}));

vi.mock("@/features/mindmaps/queries", () => ({
  getMindmapsBySubjectForUser: getMindmapsBySubjectForUserMock,
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
