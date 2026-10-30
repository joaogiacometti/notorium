import { isNotNull } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { flashcard } from "@/db/schema";
import { getFlashcardsManagePageForUser } from "@/features/flashcards/queries";

// Answers every select with no rows; the test only checks filters. `where`
// is awaited directly by the count query and chained by the page query.
class FakeEmptySelectDb {
  select() {
    const paged = {
      orderBy: () => paged,
      limit: () => paged,
      offset: async () => [],
    };
    const filtered = Object.assign(Promise.resolve([]), paged);
    const joined = { innerJoin: () => joined, where: () => filtered };
    return { from: () => joined };
  }
}

vi.mock("@/db/index", () => ({ getDb: () => new FakeEmptySelectDb() }));

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return { ...actual, isNotNull: vi.fn(actual.isNotNull) };
});

vi.mock("@/features/subjects/queries", () => ({
  getDescendantSubjectIds: async () => [],
  getSubjectPathForUser: async () => null,
  getSubjectPathMapForUser: async () => new Map(),
}));

describe("getFlashcardsManagePageForUser filter", () => {
  beforeEach(() => {
    vi.mocked(isNotNull).mockClear();
  });

  it("limits the page to study-later cards when that filter is set", async () => {
    await getFlashcardsManagePageForUser("user-1", {
      pageIndex: 0,
      pageSize: 25,
      filter: "studyLater",
    });

    expect(isNotNull).toHaveBeenCalledWith(flashcard.studyLaterAt);
  });

  it("does not filter by the mark without the filter", async () => {
    await getFlashcardsManagePageForUser("user-1", {
      pageIndex: 0,
      pageSize: 25,
    });

    expect(isNotNull).not.toHaveBeenCalled();
  });
});
