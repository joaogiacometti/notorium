import { beforeEach, expect, it, vi } from "vitest";

const { hierarchy } = vi.hoisted(() => {
  class FakeSubjectHierarchy {
    parents = new Map<string, string | null>([
      ["a", null],
      ["b", null],
    ]);

    async record(_userId: string, id: string) {
      return { id, name: id, parentSubjectId: this.parents.get(id) ?? null };
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
        update: FakeSubjectHierarchy["update"];
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

    set(values: { parentSubjectId: string | null }) {
      return {
        where: async (conditions: { column: string; value: string }[]) => {
          const id = conditions.find((condition) => condition.column === "id");
          if (!id) throw new Error("Missing id; expected an id condition");
          this.parents.set(id.value, values.parentSubjectId);
        },
      };
    }
  }

  return { hierarchy: new FakeSubjectHierarchy() };
});

vi.mock("drizzle-orm", () => ({
  sql: vi.fn(),
  eq: (column: string, value: string) => ({ column, value }),
  and: (...conditions: { column: string; value: string }[]) => conditions,
}));
vi.mock("@/db/index", () => ({ getDb: () => hierarchy }));
vi.mock("@/db/schema", () => ({ subject: { id: "id", userId: "userId" } }));
vi.mock("@/features/subjects/subject-write", () => ({
  insertSubjectRow: vi.fn(),
  resolveSubjectUniqueError: vi.fn(),
}));
vi.mock("@/features/subjects/queries", () => ({
  getSubjectTreeRecordForUser: hierarchy.record.bind(hierarchy),
  getSubjectRecordForUser: hierarchy.record.bind(hierarchy),
  isSubjectAncestorOf: hierarchy.ancestor.bind(hierarchy),
  getSubjectDepthForUser: hierarchy.depth.bind(hierarchy),
  countChildSubjectsForUser: hierarchy.childCount.bind(hierarchy),
  getSubjectSubtreeHeightForUser: hierarchy.subtreeHeight.bind(hierarchy),
  countTotalSubjectsForUser: vi.fn(),
  getAllSubjectsWithPathsForUser: vi.fn(),
}));

beforeEach(() => {
  hierarchy.parents = new Map([
    ["a", null],
    ["b", null],
    ["c", null],
  ]);
  hierarchy.lockTail = Promise.resolve();
});

it("rejects the second overlapping move that would create a subject cycle", async () => {
  const { moveSubjectForUser } = await import("@/features/subjects/mutations");
  const results = await Promise.all([
    moveSubjectForUser("owner", { id: "a", parentSubjectId: "b" }),
    moveSubjectForUser("owner", { id: "b", parentSubjectId: "a" }),
  ]);

  expect(results.map((result) => result.success)).toEqual([true, false]);
  expect(results[1]).toMatchObject({ errorCode: "subjects.wouldCreateCycle" });
  expect(hierarchy.parents.get("a")).toBe("b");
  expect(hierarchy.parents.get("b")).toBeNull();
});

it("allows compatible overlapping moves", async () => {
  const { moveSubjectForUser } = await import("@/features/subjects/mutations");
  const results = await Promise.all([
    moveSubjectForUser("owner", { id: "a", parentSubjectId: "c" }),
    moveSubjectForUser("owner", { id: "b", parentSubjectId: "c" }),
  ]);

  expect(results.every((result) => result.success)).toBe(true);
  expect(hierarchy.parents.get("a")).toBe("c");
  expect(hierarchy.parents.get("b")).toBe("c");
});
