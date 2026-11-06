import { beforeEach, describe, expect, it, vi } from "vitest";

const executeMock = vi.fn();
const selectWhereMock = vi.fn();

vi.mock("@/db/index", () => ({
  getDb: () => ({
    execute: executeMock,
    select: () => ({ from: () => ({ where: selectWhereMock }) }),
  }),
}));

describe("getFolderAncestors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns root-first breadcrumb records without raw query metadata", async () => {
    executeMock.mockResolvedValueOnce({
      rows: [
        { id: "parent", name: "Calculus", depth: 1 },
        { id: "root", name: "Math", depth: 2 },
      ],
    });

    const { getFolderAncestors } = await import("@/features/folders/queries");

    const ancestors = await getFolderAncestors("user-1", "folder-1");

    expect(ancestors).toEqual([
      { id: "root", name: "Math" },
      { id: "parent", name: "Calculus" },
    ]);
  });
});

describe("getFolderSubtreeHeightForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the recursive subtree height", async () => {
    executeMock.mockResolvedValueOnce({ rows: [{ height: 3 }] });

    const { getFolderSubtreeHeightForUser } = await import(
      "@/features/folders/queries"
    );

    await expect(
      getFolderSubtreeHeightForUser("user-1", "folder-1"),
    ).resolves.toBe(3);
  });
});

describe("getAllFoldersWithPathsForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // The recursive CTE returned raw snake_case rows (`user_id`, string
  // `created_at`) cast to the camelCase FolderOption contract.
  it("returns typed camelCase folders ordered by path", async () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const root = {
      id: "root",
      userId: "user-1",
      name: "Math",
      parentFolderId: null,
      createdAt,
      updatedAt: createdAt,
    };
    const child = {
      ...root,
      id: "child",
      name: "Calc",
      parentFolderId: "root",
    };
    executeMock.mockResolvedValueOnce({
      rows: [
        { id: "root", path: "Math" },
        { id: "child", path: "Math::Calc" },
      ],
    });
    selectWhereMock.mockResolvedValueOnce([child, root]);

    const { getAllFoldersWithPathsForUser } = await import(
      "@/features/folders/queries"
    );

    await expect(getAllFoldersWithPathsForUser("user-1")).resolves.toEqual([
      { ...root, path: "Math" },
      { ...child, path: "Math::Calc" },
    ]);
  });
});
