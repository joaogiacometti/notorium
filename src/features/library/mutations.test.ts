import { beforeEach, describe, expect, it, vi } from "vitest";
import { LIMITS } from "@/lib/config/limits";

const countBooksForUserMock = vi.fn();
const getBookByIdForUserMock = vi.fn();
const getMediaStorageProviderMock = vi.fn();
const consumeUserDailyRateLimitMock = vi.fn();
const deleteFilesMock = vi.fn();
const insertReturningMock = vi.fn();
const insertValuesMock = vi.fn(() => ({ returning: insertReturningMock }));
const insertMock = vi.fn(() => ({ values: insertValuesMock }));
const updateWhereMock = vi.fn();
const updateSetMock = vi.fn(() => ({ where: updateWhereMock }));
const updateMock = vi.fn(() => ({ set: updateSetMock }));
const deleteWhereMock = vi.fn();
const deleteMock = vi.fn(() => ({ where: deleteWhereMock }));
const andMock = vi.fn((...conditions) => conditions);
const eqMock = vi.fn((column, value) => ({ column, value }));

vi.mock("@/db/index", () => ({
  getDb: () => ({
    insert: insertMock,
    update: updateMock,
    delete: deleteMock,
  }),
}));

vi.mock("drizzle-orm", () => ({ and: andMock, eq: eqMock }));

vi.mock("@/db/schema", () => ({
  libraryBook: {
    id: "library_book_id_column",
    userId: "library_book_user_id_column",
  },
}));

vi.mock("@/features/library/queries", () => ({
  countBooksForUser: countBooksForUserMock,
  getBookByIdForUser: getBookByIdForUserMock,
}));

const getSubjectByIdForUserMock = vi.fn();

vi.mock("@/features/subjects/queries", () => ({
  getSubjectByIdForUser: getSubjectByIdForUserMock,
}));

vi.mock("@/features/library/utils", () => ({
  validateBookBlobPath: vi.fn(() => true),
}));

vi.mock("@/lib/media-storage/provider", () => ({
  getMediaStorageProvider: getMediaStorageProviderMock,
}));

vi.mock("@/lib/rate-limit/user-rate-limit", () => ({
  consumeUserDailyRateLimit: consumeUserDailyRateLimitMock,
}));

function validCreateInput(overrides: Record<string, unknown> = {}) {
  return {
    title: "Clean Code",
    author: "Robert Martin",
    subjectId: "subject-1",
    fileName: "clean-code.pdf",
    mimeType: "application/pdf",
    blobPathname: "notorium/library/user-1/uuid-clean-code.pdf",
    sizeBytes: 1024,
    ...overrides,
  };
}

describe("createBookForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSubjectByIdForUserMock.mockResolvedValue({ id: "subject-1" });
    countBooksForUserMock.mockResolvedValue(0);
    consumeUserDailyRateLimitMock.mockResolvedValue({
      limited: false,
      remaining: LIMITS.libraryUploadRateLimitPerDay - 1,
      resetAt: "2026-06-16T00:00:00.000Z",
    });
    insertReturningMock.mockResolvedValue([
      { id: "book-1", title: "Clean Code" },
    ]);
    getMediaStorageProviderMock.mockResolvedValue({
      deleteFiles: deleteFilesMock,
    });
  });

  it("rejects a non-pdf mime type before touching storage", async () => {
    const { createBookForUser } = await import("@/features/library/mutations");

    const result = await createBookForUser(
      "user-1",
      validCreateInput({ mimeType: "image/png" }),
    );

    expect(result).toMatchObject({
      success: false,
      errorCode: "library.mimeTypeNotAllowed",
    });
    expect(getMediaStorageProviderMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid blob pathname", async () => {
    const utilsModule = await import("@/features/library/utils");
    vi.mocked(utilsModule.validateBookBlobPath).mockReturnValueOnce(false);
    const { createBookForUser } = await import("@/features/library/mutations");

    const result = await createBookForUser("user-1", validCreateInput());

    expect(result).toMatchObject({
      success: false,
      errorCode: "library.invalidData",
    });
  });

  it("rejects a file larger than the size limit", async () => {
    const { createBookForUser } = await import("@/features/library/mutations");

    const result = await createBookForUser(
      "user-1",
      validCreateInput({ sizeBytes: LIMITS.libraryBookMaxBytes + 1 }),
    );

    expect(result).toMatchObject({
      success: false,
      errorCode: "limits.bookSizeLimit",
      errorParams: { max: LIMITS.libraryBookMaxBytes },
    });
  });

  it("rejects when the user already has the maximum number of books", async () => {
    countBooksForUserMock.mockResolvedValueOnce(LIMITS.maxBooksPerUser);
    const { createBookForUser } = await import("@/features/library/mutations");

    const result = await createBookForUser("user-1", validCreateInput());

    expect(result).toMatchObject({
      success: false,
      errorCode: "limits.bookLimit",
    });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("returns notConfigured when storage is unavailable", async () => {
    getMediaStorageProviderMock.mockResolvedValueOnce(null);
    const { createBookForUser } = await import("@/features/library/mutations");

    const result = await createBookForUser("user-1", validCreateInput());

    expect(result).toMatchObject({
      success: false,
      errorCode: "library.notConfigured",
    });
  });

  it("returns the rate-limit error when the daily upload cap is hit", async () => {
    consumeUserDailyRateLimitMock.mockResolvedValueOnce({
      limited: true,
      errorCode: "auth.rateLimited",
      remaining: 0,
      resetAt: "2026-06-16T00:00:00.000Z",
    });
    const { createBookForUser } = await import("@/features/library/mutations");

    const result = await createBookForUser("user-1", validCreateInput());

    expect(result).toMatchObject({
      success: false,
      errorCode: "auth.rateLimited",
    });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("inserts the book on success without uploading to blob", async () => {
    const { createBookForUser } = await import("@/features/library/mutations");

    const result = await createBookForUser("user-1", validCreateInput());

    expect(result).toEqual({
      success: true,
      book: { id: "book-1", title: "Clean Code" },
    });
    expect(insertValuesMock).toHaveBeenCalledWith({
      userId: "user-1",
      subjectId: "subject-1",
      title: "Clean Code",
      author: "Robert Martin",
      fileName: "clean-code.pdf",
      blobPathname: "notorium/library/user-1/uuid-clean-code.pdf",
      sizeBytes: 1024,
    });
  });

  it("cleans up the orphaned blob when the DB insert fails", async () => {
    insertReturningMock.mockRejectedValueOnce(new Error("db down"));
    const { createBookForUser } = await import("@/features/library/mutations");

    const result = await createBookForUser("user-1", validCreateInput());

    expect(result).toMatchObject({
      success: false,
      errorCode: "library.uploadFailed",
    });
    expect(deleteFilesMock).toHaveBeenCalledWith({
      pathnames: ["notorium/library/user-1/uuid-clean-code.pdf"],
    });
  });
});

describe("updateReadingPageForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateWhereMock.mockResolvedValue(undefined);
  });

  it("returns notFound when the book is not owned by the user", async () => {
    getBookByIdForUserMock.mockResolvedValueOnce(null);
    const { updateReadingPageForUser } = await import(
      "@/features/library/mutations"
    );

    const result = await updateReadingPageForUser("user-1", {
      bookId: "book-1",
      page: 10,
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: "library.notFound",
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("clamps the page to the known total before saving", async () => {
    getBookByIdForUserMock.mockResolvedValueOnce({
      id: "book-1",
      totalPages: 100,
    });
    const { updateReadingPageForUser } = await import(
      "@/features/library/mutations"
    );

    const result = await updateReadingPageForUser("user-1", {
      bookId: "book-1",
      page: 500,
    });

    expect(result).toEqual({ success: true });
    expect(updateSetMock).toHaveBeenCalledWith(
      expect.objectContaining({ currentPage: 100, totalPages: 100 }),
    );
  });

  it("captures totalPages from the payload when not yet stored", async () => {
    getBookByIdForUserMock.mockResolvedValueOnce({
      id: "book-1",
      totalPages: null,
    });
    const { updateReadingPageForUser } = await import(
      "@/features/library/mutations"
    );

    await updateReadingPageForUser("user-1", {
      bookId: "book-1",
      page: 12,
      totalPages: 200,
    });

    expect(updateSetMock).toHaveBeenCalledWith(
      expect.objectContaining({ currentPage: 12, totalPages: 200 }),
    );
  });
});

describe("updateBookZoomForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateWhereMock.mockResolvedValue(undefined);
  });

  it("returns notFound when the book is not owned by the user", async () => {
    getBookByIdForUserMock.mockResolvedValueOnce(null);
    const { updateBookZoomForUser } = await import(
      "@/features/library/mutations"
    );

    const result = await updateBookZoomForUser("user-1", {
      bookId: "book-1",
      device: "mobile",
      zoom: "fit-width",
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: "library.notFound",
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("writes only the mobile column for a mobile device", async () => {
    getBookByIdForUserMock.mockResolvedValueOnce({ id: "book-1" });
    const { updateBookZoomForUser } = await import(
      "@/features/library/mutations"
    );

    const result = await updateBookZoomForUser("user-1", {
      bookId: "book-1",
      device: "mobile",
      zoom: "1.5",
    });

    expect(result).toEqual({ success: true });
    expect(updateSetMock).toHaveBeenCalledWith({ zoomMobile: "1.5" });
  });

  it("writes only the desktop column for a desktop device", async () => {
    getBookByIdForUserMock.mockResolvedValueOnce({ id: "book-1" });
    const { updateBookZoomForUser } = await import(
      "@/features/library/mutations"
    );

    await updateBookZoomForUser("user-1", {
      bookId: "book-1",
      device: "desktop",
      zoom: "fit-page",
    });

    expect(updateSetMock).toHaveBeenCalledWith({ zoomDesktop: "fit-page" });
  });
});

describe("deleteBookForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deleteWhereMock.mockResolvedValue(undefined);
    getMediaStorageProviderMock.mockResolvedValue({
      deleteFiles: deleteFilesMock,
    });
  });

  it("returns notFound when the book is missing", async () => {
    getBookByIdForUserMock.mockResolvedValueOnce(null);
    const { deleteBookForUser } = await import("@/features/library/mutations");

    const result = await deleteBookForUser("user-1", { bookId: "book-1" });

    expect(result).toMatchObject({
      success: false,
      errorCode: "library.notFound",
    });
  });

  it("returns deleteFailed when the blob cannot be removed", async () => {
    getBookByIdForUserMock.mockResolvedValueOnce({
      id: "book-1",
      blobPathname: "notorium/library/user-1/book.pdf",
    });
    deleteFilesMock.mockRejectedValueOnce(new Error("blob error"));
    const { deleteBookForUser } = await import("@/features/library/mutations");

    const result = await deleteBookForUser("user-1", { bookId: "book-1" });

    expect(result).toMatchObject({
      success: false,
      errorCode: "library.deleteFailed",
    });
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("deletes the blob then the row on success", async () => {
    getBookByIdForUserMock.mockResolvedValueOnce({
      id: "book-1",
      blobPathname: "notorium/library/user-1/book.pdf",
    });
    deleteFilesMock.mockResolvedValueOnce(undefined);
    const { deleteBookForUser } = await import("@/features/library/mutations");

    const result = await deleteBookForUser("user-1", { bookId: "book-1" });

    expect(result).toEqual({ success: true });
    expect(deleteFilesMock).toHaveBeenCalledWith({
      pathnames: ["notorium/library/user-1/book.pdf"],
    });
    expect(deleteWhereMock).toHaveBeenCalled();
  });
});
