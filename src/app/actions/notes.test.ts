import { beforeEach, describe, expect, it, vi } from "vitest";

const { getNoteByIdForUserMock } = vi.hoisted(() => ({
  getNoteByIdForUserMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/auth", () => ({
  getAuthenticatedUserId: async () => "user-1",
}));

vi.mock("@/features/notes/mutations", () => ({
  createNoteForUser: vi.fn(),
  deleteNoteForUser: vi.fn(),
  editNoteForUser: vi.fn(),
}));

vi.mock("@/features/notes/queries", () => ({
  getNoteByIdForUser: getNoteByIdForUserMock,
}));

describe("getNoteById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects an empty id before querying", async () => {
    const { getNoteById } = await import("@/app/actions/notes");

    await expect(getNoteById("")).rejects.toThrow();
    expect(getNoteByIdForUserMock).not.toHaveBeenCalled();
  });

  it("returns the user's note", async () => {
    getNoteByIdForUserMock.mockResolvedValueOnce({ id: "note-1" });
    const { getNoteById } = await import("@/app/actions/notes");

    const result = await getNoteById("note-1");

    expect(result).toEqual({ id: "note-1" });
    expect(getNoteByIdForUserMock).toHaveBeenCalledWith("user-1", "note-1");
  });
});
