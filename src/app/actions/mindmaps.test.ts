import { beforeEach, describe, expect, it, vi } from "vitest";

const { getMindmapByIdForUserMock } = vi.hoisted(() => ({
  getMindmapByIdForUserMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/auth", () => ({
  getAuthenticatedUserId: async () => "user-1",
}));

vi.mock("@/features/mindmaps/mutations", () => ({
  createMindmapForUser: vi.fn(),
  deleteMindmapForUser: vi.fn(),
  editMindmapForUser: vi.fn(),
  editMindmapTitleForUser: vi.fn(),
  splitMindmapForUser: vi.fn(),
}));

vi.mock("@/features/mindmaps/queries", () => ({
  getMindmapByIdForUser: getMindmapByIdForUserMock,
}));

describe("getMindmapById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a non-string id before querying", async () => {
    const { getMindmapById } = await import("@/app/actions/mindmaps");

    await expect(getMindmapById(7 as unknown as string)).rejects.toThrow();
    expect(getMindmapByIdForUserMock).not.toHaveBeenCalled();
  });

  it("returns the user's mindmap", async () => {
    getMindmapByIdForUserMock.mockResolvedValueOnce({ id: "mindmap-1" });
    const { getMindmapById } = await import("@/app/actions/mindmaps");

    const result = await getMindmapById("mindmap-1");

    expect(result).toEqual({ id: "mindmap-1" });
    expect(getMindmapByIdForUserMock).toHaveBeenCalledWith(
      "user-1",
      "mindmap-1",
    );
  });
});
