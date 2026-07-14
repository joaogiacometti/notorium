import { beforeEach, describe, expect, it, vi } from "vitest";

const executeMock = vi.fn();

vi.mock("@/db/index", () => ({
  getDb: () => ({ execute: executeMock }),
}));

describe("getSubjectAncestors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns root-first breadcrumb records without raw query metadata", async () => {
    executeMock.mockResolvedValueOnce({
      rows: [
        { id: "parent", name: "Calculus", kind: "general", depth: 1 },
        { id: "root", name: "Math", kind: "academic", depth: 2 },
      ],
    });

    const { getSubjectAncestors } = await import("@/features/subjects/queries");

    const ancestors = await getSubjectAncestors("user-1", "subject-1");

    expect(ancestors).toEqual([
      { id: "root", name: "Math", kind: "academic" },
      { id: "parent", name: "Calculus", kind: "general" },
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
