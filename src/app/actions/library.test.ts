import { beforeEach, describe, expect, it, vi } from "vitest";
import { LIMITS } from "@/lib/config/limits";

const {
  createBookForUserMock,
  updateReadingPageForUserMock,
  deleteBookForUserMock,
  getAuthenticatedUserIdMock,
  revalidatePathMock,
  countBooksForUserMock,
  isMediaStorageConfiguredMock,
  generateClientTokenFromReadWriteTokenMock,
} = vi.hoisted(() => ({
  createBookForUserMock: vi.fn(),
  updateReadingPageForUserMock: vi.fn(),
  deleteBookForUserMock: vi.fn(),
  getAuthenticatedUserIdMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  countBooksForUserMock: vi.fn(),
  isMediaStorageConfiguredMock: vi.fn(),
  generateClientTokenFromReadWriteTokenMock: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));

vi.mock("@vercel/blob/client", () => ({
  generateClientTokenFromReadWriteToken:
    generateClientTokenFromReadWriteTokenMock,
}));

vi.mock("@/lib/auth/auth", () => ({
  getAuthenticatedUserId: getAuthenticatedUserIdMock,
}));

vi.mock("@/features/library/mutations", () => ({
  createBookForUser: createBookForUserMock,
  updateReadingPageForUser: updateReadingPageForUserMock,
  deleteBookForUser: deleteBookForUserMock,
}));

vi.mock("@/features/library/queries", () => ({
  countBooksForUser: countBooksForUserMock,
}));

vi.mock("@/features/library/utils", () => ({
  buildBookBlobPath: vi.fn(() => "notorium/library/user-1/uuid-book.pdf"),
  validateBookBlobPath: vi.fn(() => true),
}));

vi.mock("@/lib/media-storage/provider", () => ({
  isMediaStorageConfigured: isMediaStorageConfiguredMock,
}));

function validUpload(overrides: Record<string, unknown> = {}) {
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

describe("library actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthenticatedUserIdMock.mockResolvedValue("user-1");
  });

  describe("generateLibraryUploadToken", () => {
    beforeEach(() => {
      countBooksForUserMock.mockResolvedValue(0);
      isMediaStorageConfiguredMock.mockReturnValue(true);
      generateClientTokenFromReadWriteTokenMock.mockResolvedValue(
        "client-token-123",
      );
    });

    it("returns a token and pathname on success", async () => {
      const { generateLibraryUploadToken } = await import(
        "@/app/actions/library"
      );

      const result = await generateLibraryUploadToken({
        fileName: "book.pdf",
        mimeType: "application/pdf",
      });

      expect(result).toEqual({
        success: true,
        token: "client-token-123",
        pathname: "notorium/library/user-1/uuid-book.pdf",
      });
    });

    it("rejects when storage is not configured", async () => {
      isMediaStorageConfiguredMock.mockReturnValueOnce(false);
      const { generateLibraryUploadToken } = await import(
        "@/app/actions/library"
      );

      const result = await generateLibraryUploadToken({
        fileName: "book.pdf",
        mimeType: "application/pdf",
      });

      expect(result).toEqual({
        success: false,
        error: "library.notConfigured",
      });
    });

    it("rejects when the user has reached the book limit", async () => {
      countBooksForUserMock.mockResolvedValueOnce(LIMITS.maxBooksPerUser);
      const { generateLibraryUploadToken } = await import(
        "@/app/actions/library"
      );

      const result = await generateLibraryUploadToken({
        fileName: "book.pdf",
        mimeType: "application/pdf",
      });

      expect(result).toEqual({
        success: false,
        error: "limits.bookLimit",
      });
    });

    it("rejects non-pdf mime types", async () => {
      const { generateLibraryUploadToken } = await import(
        "@/app/actions/library"
      );

      const result = await generateLibraryUploadToken({
        fileName: "book.png",
        mimeType: "image/png",
      });

      expect(result).toEqual({
        success: false,
        error: "library.invalidData",
      });
    });
  });

  it("uploadBook revalidates the app layout on success", async () => {
    createBookForUserMock.mockResolvedValue({
      success: true,
      book: { id: "book-1" },
    });
    const { uploadBook } = await import("@/app/actions/library");

    const result = await uploadBook(validUpload());

    expect(result).toMatchObject({ success: true });
    expect(revalidatePathMock).toHaveBeenCalledWith("/", "layout");
  });

  it("uploadBook rejects invalid input before the mutation runs", async () => {
    const { uploadBook } = await import("@/app/actions/library");

    const result = await uploadBook(validUpload({ mimeType: "image/png" }));

    expect(result).toMatchObject({
      success: false,
      errorCode: "library.invalidData",
    });
    expect(createBookForUserMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("updateReadingPage never revalidates, even on success", async () => {
    updateReadingPageForUserMock.mockResolvedValue({ success: true });
    const { updateReadingPage } = await import("@/app/actions/library");

    const result = await updateReadingPage({ bookId: "book-1", page: 42 });

    expect(result).toMatchObject({ success: true });
    expect(updateReadingPageForUserMock).toHaveBeenCalledWith("user-1", {
      bookId: "book-1",
      page: 42,
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("updateReadingPage rejects a non-positive page before the mutation", async () => {
    const { updateReadingPage } = await import("@/app/actions/library");

    const result = await updateReadingPage({ bookId: "book-1", page: 0 });

    expect(result).toMatchObject({
      success: false,
      errorCode: "library.invalidData",
    });
    expect(updateReadingPageForUserMock).not.toHaveBeenCalled();
  });

  it("deleteBook revalidates the app layout on success", async () => {
    deleteBookForUserMock.mockResolvedValue({ success: true });
    const { deleteBook } = await import("@/app/actions/library");

    const result = await deleteBook({ bookId: "book-1" });

    expect(result).toMatchObject({ success: true });
    expect(revalidatePathMock).toHaveBeenCalledWith("/", "layout");
  });
});
