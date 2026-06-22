import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const orderByMock = vi.fn();
const limitMock = vi.fn();
const whereMock = vi.fn();
const fromMock = vi.fn(() => ({ where: whereMock }));
const selectMock = vi.fn(() => ({ from: fromMock }));
const andMock = vi.fn((...conditions) => conditions);
const eqMock = vi.fn((column, value) => ({ column, value }));

vi.mock("@/db/index", () => ({
  getDb: () => ({ select: selectMock }),
}));

vi.mock("drizzle-orm", () => ({
  and: andMock,
  count: vi.fn(() => "count_expr"),
  desc: vi.fn((column) => ({ column, order: "desc" })),
  eq: eqMock,
}));

vi.mock("@/db/schema", () => ({
  libraryBook: {
    id: "library_book_id_column",
    userId: "library_book_user_id_column",
    updatedAt: "library_book_updated_at_column",
  },
}));

let queries: typeof import("./queries");

describe("library queries", () => {
  beforeAll(async () => {
    queries = await import("./queries");
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists a user's most recent books limited to the requested count", async () => {
    const books = [{ id: "book-1" }, { id: "book-2" }];
    whereMock.mockReturnValueOnce({ orderBy: orderByMock });
    orderByMock.mockReturnValueOnce({ limit: limitMock });
    limitMock.mockResolvedValueOnce(books);

    const result = await queries.getRecentBooksForUser("user-1", 6);

    expect(result).toBe(books);
    expect(limitMock).toHaveBeenCalledWith(6);
    expect(eqMock).toHaveBeenCalledWith(
      "library_book_user_id_column",
      "user-1",
    );
  });

  it("returns a single owned book by id", async () => {
    const book = { id: "book-1", userId: "user-1" };
    whereMock.mockReturnValueOnce({ limit: limitMock });
    limitMock.mockResolvedValueOnce([book]);

    const result = await queries.getBookByIdForUser("user-1", "book-1");

    expect(result).toBe(book);
    expect(eqMock).toHaveBeenCalledWith("library_book_id_column", "book-1");
    expect(eqMock).toHaveBeenCalledWith(
      "library_book_user_id_column",
      "user-1",
    );
  });

  it("returns null when the book is missing or owned by another user", async () => {
    whereMock.mockReturnValueOnce({ limit: limitMock });
    limitMock.mockResolvedValueOnce([]);

    expect(await queries.getBookByIdForUser("user-1", "book-x")).toBeNull();
  });

  it("counts the books owned by a user", async () => {
    whereMock.mockResolvedValueOnce([{ total: 4 }]);

    expect(await queries.countBooksForUser("user-1")).toBe(4);
  });

  it("returns zero when the count query yields no rows", async () => {
    whereMock.mockResolvedValueOnce([]);

    expect(await queries.countBooksForUser("user-1")).toBe(0);
  });
});
