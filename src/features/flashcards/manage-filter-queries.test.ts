import { isNotNull, isNull, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { flashcard } from "@/db/schema";
import { getFlashcardsManagePageForUser } from "@/features/flashcards/queries";
import { buildStrugglingFlashcardFilter } from "@/features/flashcards/struggling-filter";

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
  return {
    ...actual,
    isNotNull: vi.fn(actual.isNotNull),
    isNull: vi.fn(actual.isNull),
  };
});

vi.mock("@/features/flashcards/struggling-filter", () => ({
  buildStrugglingFlashcardFilter: vi.fn(() => sql`true`),
}));

vi.mock("@/features/folders/queries", () => ({
  getDescendantFolderIds: async () => [],
  getFolderPathForUser: async () => null,
  getFolderPathMapForUser: async () => new Map(),
}));

describe("getFlashcardsManagePageForUser filter", () => {
  beforeEach(() => {
    vi.mocked(isNotNull).mockClear();
    vi.mocked(isNull).mockClear();
    vi.mocked(buildStrugglingFlashcardFilter).mockClear();
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
    expect(buildStrugglingFlashcardFilter).not.toHaveBeenCalled();
  });

  it("limits the page to the user's struggling cards when that filter is set", async () => {
    await getFlashcardsManagePageForUser("user-1", {
      pageIndex: 0,
      pageSize: 25,
      filter: "struggling",
    });

    expect(buildStrugglingFlashcardFilter).toHaveBeenCalledWith("user-1");
    expect(isNotNull).not.toHaveBeenCalled();
  });

  it("leaves archived cards out of the struggling filter", async () => {
    await getFlashcardsManagePageForUser("user-1", {
      pageIndex: 0,
      pageSize: 25,
      filter: "struggling",
    });

    expect(isNull).toHaveBeenCalledWith(flashcard.archivedAt);
  });

  it("limits the page to archived cards when that filter is set", async () => {
    await getFlashcardsManagePageForUser("user-1", {
      pageIndex: 0,
      pageSize: 25,
      filter: "archived",
    });

    expect(isNotNull).toHaveBeenCalledWith(flashcard.archivedAt);
  });

  it("lists only cards in review by default", async () => {
    await getFlashcardsManagePageForUser("user-1", {
      pageIndex: 0,
      pageSize: 25,
    });

    expect(isNull).toHaveBeenCalledWith(flashcard.archivedAt);
  });

  it("lists archived cards too when showing all cards", async () => {
    await getFlashcardsManagePageForUser("user-1", {
      pageIndex: 0,
      pageSize: 25,
      filter: "all",
    });

    expect(isNull).not.toHaveBeenCalled();
    expect(isNotNull).not.toHaveBeenCalled();
  });
});
