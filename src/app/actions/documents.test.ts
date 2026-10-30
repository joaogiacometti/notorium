import { beforeEach, describe, expect, it, vi } from "vitest";

const { moveNoteForUserMock, movePdfForUserMock, revalidateAppShellMock } =
  vi.hoisted(() => ({
    moveNoteForUserMock: vi.fn(),
    movePdfForUserMock: vi.fn(),
    revalidateAppShellMock: vi.fn(),
  }));

vi.mock("@/lib/auth/auth", () => ({
  getAuthenticatedUserId: async () => "user-1",
}));
vi.mock("@/features/notes/mutations", () => ({
  moveNoteForUser: moveNoteForUserMock,
}));
vi.mock("@/features/pdfs/mutations", () => ({
  movePdfForUser: movePdfForUserMock,
}));
vi.mock("@/lib/server/revalidate-views", () => ({
  revalidateAppShell: revalidateAppShellMock,
}));

const moved = { success: true, subjectId: "s2", previousSubjectId: "s1" };

describe("moveDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    moveNoteForUserMock.mockResolvedValue(moved);
    movePdfForUserMock.mockResolvedValue(moved);
  });

  it("moves a PDF through the PDF mutation", async () => {
    const { moveDocument } = await import("@/app/actions/documents");

    const result = await moveDocument({
      kind: "pdf",
      id: "p1",
      subjectId: "s2",
    });

    expect(result).toEqual(moved);
    expect(movePdfForUserMock).toHaveBeenCalledWith("user-1", {
      id: "p1",
      subjectId: "s2",
    });
    expect(moveNoteForUserMock).not.toHaveBeenCalled();
    expect(revalidateAppShellMock).toHaveBeenCalledOnce();
  });

  it("moves a note through the note mutation", async () => {
    const { moveDocument } = await import("@/app/actions/documents");

    await moveDocument({ kind: "note", id: "n1", subjectId: "s2" });

    expect(moveNoteForUserMock).toHaveBeenCalledWith("user-1", {
      id: "n1",
      subjectId: "s2",
    });
    expect(movePdfForUserMock).not.toHaveBeenCalled();
  });

  it("rejects an unknown document kind", async () => {
    const { moveDocument } = await import("@/app/actions/documents");

    const result = await moveDocument({
      kind: "video" as "pdf",
      id: "v1",
      subjectId: "s2",
    });

    expect(result).toMatchObject({ errorCode: "documents.invalidData" });
    expect(revalidateAppShellMock).not.toHaveBeenCalled();
  });
});
