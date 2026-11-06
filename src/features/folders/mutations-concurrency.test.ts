import { beforeEach, expect, it, vi } from "vitest";

const { hierarchy } = vi.hoisted(() => {
  class FakeFolderHierarchy {
    parents = new Map<string, string | null>([
      ["a", null],
      ["b", null],
    ]);

    async record(_userId: string, id: string) {
      return { id, name: id, parentFolderId: this.parents.get(id) ?? null };
    }

    async ancestor(_userId: string, ancestorId: string, targetId: string) {
      let current = this.parents.get(targetId);
      while (current) {
        if (current === ancestorId) return true;
        current = this.parents.get(current);
      }
      return false;
    }

    async depth(_userId: string, id: string) {
      let depth = 1;
      let parent = this.parents.get(id);
      while (parent) {
        depth += 1;
        parent = this.parents.get(parent);
      }
      return depth;
    }

    async childCount(_userId: string, id: string) {
      return [...this.parents.values()].filter((parent) => parent === id)
        .length;
    }

    async subtreeHeight() {
      return 1;
    }

    lockTail: Promise<void> = Promise.resolve();

    async transaction<T>(
      callback: (transaction: {
        execute: () => Promise<void>;
        update: FakeFolderHierarchy["update"];
      }) => Promise<T>,
    ): Promise<T> {
      let release = (): void => {};
      const execute = async (): Promise<void> => {
        const previous = this.lockTail;
        this.lockTail = new Promise<void>((resolve) => {
          release = resolve;
        });
        await previous;
      };
      try {
        return await callback({ execute, update: this.update.bind(this) });
      } finally {
        release();
      }
    }

    update() {
      return { set: this.set.bind(this) };
    }

    set(values: { parentFolderId: string | null }) {
      return {
        where: async (conditions: { column: string; value: string }[]) => {
          const id = conditions.find((condition) => condition.column === "id");
          if (!id) throw new Error("Missing id; expected an id condition");
          this.parents.set(id.value, values.parentFolderId);
        },
      };
    }
  }

  return { hierarchy: new FakeFolderHierarchy() };
});

vi.mock("drizzle-orm", () => ({
  sql: vi.fn(),
  eq: (column: string, value: string) => ({ column, value }),
  and: (...conditions: { column: string; value: string }[]) => conditions,
}));
vi.mock("@/db/index", () => ({ getDb: () => hierarchy }));
vi.mock("@/db/schema", () => ({ folder: { id: "id", userId: "userId" } }));
vi.mock("@/features/folders/folder-write", () => ({
  insertFolderRow: vi.fn(),
  resolveFolderUniqueError: vi.fn(),
}));
vi.mock("@/features/folders/queries", () => ({
  getFolderTreeRecordForUser: hierarchy.record.bind(hierarchy),
  getFolderRecordForUser: hierarchy.record.bind(hierarchy),
  isFolderAncestorOf: hierarchy.ancestor.bind(hierarchy),
  getFolderDepthForUser: hierarchy.depth.bind(hierarchy),
  countChildFoldersForUser: hierarchy.childCount.bind(hierarchy),
  getFolderSubtreeHeightForUser: hierarchy.subtreeHeight.bind(hierarchy),
  countTotalFoldersForUser: vi.fn(),
  getAllFoldersWithPathsForUser: vi.fn(),
}));

beforeEach(() => {
  hierarchy.parents = new Map([
    ["a", null],
    ["b", null],
    ["c", null],
  ]);
  hierarchy.lockTail = Promise.resolve();
});

it("rejects the second overlapping move that would create a folder cycle", async () => {
  const { moveFolderForUser } = await import("@/features/folders/mutations");
  const results = await Promise.all([
    moveFolderForUser("owner", { id: "a", parentFolderId: "b" }),
    moveFolderForUser("owner", { id: "b", parentFolderId: "a" }),
  ]);

  expect(results.map((result) => result.success)).toEqual([true, false]);
  expect(results[1]).toMatchObject({ errorCode: "folders.wouldCreateCycle" });
  expect(hierarchy.parents.get("a")).toBe("b");
  expect(hierarchy.parents.get("b")).toBeNull();
});

it("allows compatible overlapping moves", async () => {
  const { moveFolderForUser } = await import("@/features/folders/mutations");
  const results = await Promise.all([
    moveFolderForUser("owner", { id: "a", parentFolderId: "c" }),
    moveFolderForUser("owner", { id: "b", parentFolderId: "c" }),
  ]);

  expect(results.every((result) => result.success)).toBe(true);
  expect(hierarchy.parents.get("a")).toBe("c");
  expect(hierarchy.parents.get("b")).toBe("c");
});
