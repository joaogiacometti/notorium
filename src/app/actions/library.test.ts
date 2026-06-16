import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createBookForUserMock,
  updateReadingPageForUserMock,
  deleteBookForUserMock,
  getAuthenticatedUserIdMock,
  revalidatePathMock,
} = vi.hoisted(() => ({
  createBookForUserMock: vi.fn(),
  updateReadingPageForUserMock: vi.fn(),
  deleteBookForUserMock: vi.fn(),
  getAuthenticatedUserIdMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));

vi.mock("@/lib/auth/auth", () => ({
  getAuthenticatedUserId: getAuthenticatedUserIdMock,
}));

vi.mock("@/features/library/mutations", () => ({
  createBookForUser: createBookForUserMock,
  updateReadingPageForUser: updateReadingPageForUserMock,
  deleteBookForUser: deleteBookForUserMock,
}));

vi.mock("@/features/library/queries", () => ({
  getBooksForUser: vi.fn(),
  getBookByIdForUser: vi.fn(),
}));

function validUpload(overrides: Record<string, unknown> = {}) {
  return {
    title: "Clean Code",
    author: "Robert Martin",
    fileName: "clean-code.pdf",
    mimeType: "application/pdf",
    dataBase64: "aGVsbG8=",
    ...overrides,
  };
}

describe("library actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthenticatedUserIdMock.mockResolvedValue("user-1");
  });

  it("uploadBook revalidates the library route on success", async () => {
    createBookForUserMock.mockResolvedValue({
      success: true,
      book: { id: "book-1" },
    });
    const { uploadBook } = await import("@/app/actions/library");

    const result = await uploadBook(validUpload());

    expect(result).toMatchObject({ success: true });
    expect(revalidatePathMock).toHaveBeenCalledWith("/library");
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

  it("deleteBook revalidates the library route on success", async () => {
    deleteBookForUserMock.mockResolvedValue({ success: true });
    const { deleteBook } = await import("@/app/actions/library");

    const result = await deleteBook({ bookId: "book-1" });

    expect(result).toMatchObject({ success: true });
    expect(revalidatePathMock).toHaveBeenCalledWith("/library");
  });
});
