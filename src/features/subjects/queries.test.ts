import { beforeEach, describe, expect, it, vi } from "vitest";

const executeMock = vi.fn();
const selectWhereMock = vi.fn();

vi.mock("@/db/index", () => ({
  getDb: () => ({
    execute: executeMock,
    select: () => ({ from: () => ({ where: selectWhereMock }) }),
  }),
}));

describe("getSubjectAncestors", () => {
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

    const { getSubjectAncestors } = await import("@/features/subjects/queries");

    const ancestors = await getSubjectAncestors("user-1", "subject-1");

    expect(ancestors).toEqual([
      { id: "root", name: "Math" },
      { id: "parent", name: "Calculus" },
    ]);
  });
});

describe("getSubjectSubtreeHeightForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the recursive subtree height", async () => {
    executeMock.mockResolvedValueOnce({ rows: [{ height: 3 }] });

    const { getSubjectSubtreeHeightForUser } = await import(
      "@/features/subjects/queries"
    );

    await expect(
      getSubjectSubtreeHeightForUser("user-1", "subject-1"),
    ).resolves.toBe(3);
  });
});

describe("getAllSubjectsWithPathsForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // The recursive CTE returned raw snake_case rows (`user_id`, string
  // `created_at`) cast to the camelCase SubjectOption contract.
  it("returns typed camelCase subjects ordered by path", async () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const root = {
      id: "root",
      userId: "user-1",
      name: "Math",
      parentSubjectId: null,
      createdAt,
      updatedAt: createdAt,
    };
    const child = {
      ...root,
      id: "child",
      name: "Calc",
      parentSubjectId: "root",
    };
    executeMock.mockResolvedValueOnce({
      rows: [
        { id: "root", path: "Math" },
        { id: "child", path: "Math::Calc" },
      ],
    });
    selectWhereMock.mockResolvedValueOnce([child, root]);

    const { getAllSubjectsWithPathsForUser } = await import(
      "@/features/subjects/queries"
    );

    await expect(getAllSubjectsWithPathsForUser("user-1")).resolves.toEqual([
      { ...root, path: "Math" },
      { ...child, path: "Math::Calc" },
    ]);
  });
});
