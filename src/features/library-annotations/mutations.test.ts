import { beforeEach, describe, expect, it, vi } from "vitest";
import { LIMITS } from "@/lib/config/limits";

const getBookByIdForUserMock = vi.hoisted(() => vi.fn());
const countAnnotationsForBookMock = vi.hoisted(() => vi.fn());

const limitMock = vi.hoisted(() => vi.fn());
const selectWhereMock = vi.hoisted(() => vi.fn(() => ({ limit: limitMock })));
const fromMock = vi.hoisted(() => vi.fn(() => ({ where: selectWhereMock })));
const selectMock = vi.hoisted(() => vi.fn(() => ({ from: fromMock })));

const onConflictMock = vi.hoisted(() => vi.fn());
const insertValuesMock = vi.hoisted(() =>
  vi.fn(() => ({ onConflictDoUpdate: onConflictMock })),
);
const insertMock = vi.hoisted(() =>
  vi.fn(() => ({ values: insertValuesMock })),
);

const deleteWhereMock = vi.hoisted(() => vi.fn());
const deleteMock = vi.hoisted(() => vi.fn(() => ({ where: deleteWhereMock })));

vi.mock("@/db/index", () => ({
  getDb: () => ({
    select: selectMock,
    insert: insertMock,
    delete: deleteMock,
  }),
}));

vi.mock("drizzle-orm", () => ({
  and: (...conditions: unknown[]) => conditions,
  eq: (column: unknown, value: unknown) => ({ column, value }),
}));

vi.mock("@/db/schema", () => ({
  libraryAnnotation: {
    id: "id_column",
    userId: "user_id_column",
    bookId: "book_id_column",
    annotationUid: "annotation_uid_column",
  },
}));

vi.mock("@/features/library/queries", () => ({
  getBookByIdForUser: getBookByIdForUserMock,
}));

vi.mock("@/features/library-annotations/queries", () => ({
  countAnnotationsForBook: countAnnotationsForBookMock,
}));

import {
  deleteAnnotationForUser,
  saveAnnotationForUser,
} from "@/features/library-annotations/mutations";

function highlight(overrides: Record<string, unknown> = {}) {
  return {
    id: "anno-1",
    type: 9 as const,
    pageIndex: 2,
    rect: { origin: { x: 0, y: 0 }, size: { width: 10, height: 4 } },
    segmentRects: [{ origin: { x: 0, y: 0 }, size: { width: 10, height: 4 } }],
    opacity: 0.4,
    ...overrides,
  };
}

describe("saveAnnotationForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getBookByIdForUserMock.mockResolvedValue({ id: "book-1" });
    limitMock.mockResolvedValue([]);
    countAnnotationsForBookMock.mockResolvedValue(0);
    onConflictMock.mockResolvedValue(undefined);
  });

  it("returns notFound when the book is not owned by the user", async () => {
    getBookByIdForUserMock.mockResolvedValue(null);
    const result = await saveAnnotationForUser("user-1", {
      bookId: "book-1",
      annotation: highlight(),
    });
    expect(result).toMatchObject({
      success: false,
      errorCode: "library.notFound",
    });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("upserts the highlight for an owned book", async () => {
    const result = await saveAnnotationForUser("user-1", {
      bookId: "book-1",
      annotation: highlight(),
    });
    expect(result).toEqual({ success: true });
    expect(insertValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        bookId: "book-1",
        annotationUid: "anno-1",
        pageIndex: 2,
      }),
    );
    expect(onConflictMock).toHaveBeenCalled();
  });

  it("rejects a new highlight once the per-book cap is reached", async () => {
    countAnnotationsForBookMock.mockResolvedValue(LIMITS.maxAnnotationsPerBook);
    const result = await saveAnnotationForUser("user-1", {
      bookId: "book-1",
      annotation: highlight(),
    });
    expect(result).toMatchObject({
      success: false,
      errorCode: "library.annotationLimit",
    });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("allows editing an existing highlight even at the cap", async () => {
    countAnnotationsForBookMock.mockResolvedValue(LIMITS.maxAnnotationsPerBook);
    limitMock.mockResolvedValue([{ id: "row-1" }]);
    const result = await saveAnnotationForUser("user-1", {
      bookId: "book-1",
      annotation: highlight(),
    });
    expect(result).toEqual({ success: true });
    expect(onConflictMock).toHaveBeenCalled();
  });
});

describe("deleteAnnotationForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deleteWhereMock.mockResolvedValue(undefined);
  });

  it("deletes by user, book, and annotation uid", async () => {
    const result = await deleteAnnotationForUser("user-1", {
      bookId: "book-1",
      annotationUid: "anno-1",
    });
    expect(result).toEqual({ success: true });
    expect(deleteMock).toHaveBeenCalled();
    expect(deleteWhereMock).toHaveBeenCalled();
  });
});
