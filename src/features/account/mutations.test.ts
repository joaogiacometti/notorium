import { beforeEach, describe, expect, it, vi } from "vitest";

const signOutMock = vi.fn();
const deleteUserMock = vi.fn();
const getAuthenticatedUserIdMock = vi.fn();
const getMediaStorageProviderMock = vi.fn();
const deleteImagesMock = vi.fn();
const listImagePathnamesMock = vi.fn();
const headersMock = vi.fn();

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("@/lib/auth/auth", () => ({
  getAuth: () => ({
    api: {
      signOut: signOutMock,
      deleteUser: deleteUserMock,
    },
  }),
  getAuthenticatedUserId: getAuthenticatedUserIdMock,
}));

vi.mock("@/lib/media-storage/provider", () => ({
  getMediaStorageProvider: getMediaStorageProviderMock,
}));

describe("deleteAccountForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    headersMock.mockResolvedValue(new Headers());
    getAuthenticatedUserIdMock.mockResolvedValue("user-1");
    signOutMock.mockResolvedValue(undefined);
    deleteUserMock.mockResolvedValue(undefined);
    deleteImagesMock.mockResolvedValue(undefined);
    listImagePathnamesMock.mockReset();
    getMediaStorageProviderMock.mockResolvedValue({
      deleteImages: deleteImagesMock,
      listImagePathnames: listImagePathnamesMock,
    });
  });

  it("deletes the user before cleaning up owned note and flashcard blobs", async () => {
    listImagePathnamesMock
      .mockResolvedValueOnce(["notorium/notes/user-1/a.png"])
      .mockResolvedValueOnce(["notorium/flashcards/user-1/b.png"]);

    const { deleteAccountForUser } = await import(
      "@/features/account/mutations"
    );

    const result = await deleteAccountForUser();

    expect(result).toEqual({ success: true });
    expect(deleteImagesMock).toHaveBeenCalledWith({
      pathnames: [
        "notorium/notes/user-1/a.png",
        "notorium/flashcards/user-1/b.png",
      ],
    });
    expect(deleteUserMock).toHaveBeenCalled();
    expect(signOutMock).not.toHaveBeenCalled();
    expect(deleteUserMock.mock.invocationCallOrder[0]).toBeLessThan(
      deleteImagesMock.mock.invocationCallOrder[0],
    );
  });

  it("returns success when no blob provider is configured", async () => {
    getMediaStorageProviderMock.mockResolvedValueOnce(null);

    const { deleteAccountForUser } = await import(
      "@/features/account/mutations"
    );

    const result = await deleteAccountForUser();

    expect(result).toEqual({ success: true });
    expect(deleteUserMock).toHaveBeenCalled();
    expect(listImagePathnamesMock).not.toHaveBeenCalled();
    expect(deleteImagesMock).not.toHaveBeenCalled();
    expect(signOutMock).not.toHaveBeenCalled();
  });

  it("returns success when blob listing fails before deleting the user", async () => {
    listImagePathnamesMock.mockRejectedValueOnce(new Error("listing failed"));

    const { deleteAccountForUser } = await import(
      "@/features/account/mutations"
    );

    const result = await deleteAccountForUser();

    expect(result).toEqual({ success: true });
    expect(deleteUserMock).toHaveBeenCalled();
    expect(deleteImagesMock).not.toHaveBeenCalled();
    expect(signOutMock).not.toHaveBeenCalled();
  });

  it("returns success when blob cleanup fails after deleting the user", async () => {
    listImagePathnamesMock
      .mockResolvedValueOnce(["notorium/notes/user-1/a.png"])
      .mockResolvedValueOnce(["notorium/flashcards/user-1/b.png"]);
    deleteImagesMock.mockRejectedValueOnce(new Error("cleanup failed"));

    const { deleteAccountForUser } = await import(
      "@/features/account/mutations"
    );

    const result = await deleteAccountForUser();

    expect(result).toEqual({ success: true });
    expect(deleteUserMock).toHaveBeenCalled();
    expect(signOutMock).not.toHaveBeenCalled();
    expect(deleteImagesMock).toHaveBeenCalledWith({
      pathnames: [
        "notorium/notes/user-1/a.png",
        "notorium/flashcards/user-1/b.png",
      ],
    });
  });

  it("returns an error when auth deletion fails and skips blob cleanup", async () => {
    listImagePathnamesMock
      .mockResolvedValueOnce(["notorium/notes/user-1/a.png"])
      .mockResolvedValueOnce(["notorium/flashcards/user-1/b.png"]);
    deleteUserMock.mockRejectedValueOnce(new Error("auth failed"));

    const { deleteAccountForUser } = await import(
      "@/features/account/mutations"
    );

    const result = await deleteAccountForUser();

    expect(result).toEqual({
      success: false,
      errorCode: "account.deleteFailed",
      errorParams: undefined,
      errorMessage: undefined,
    });
    expect(deleteUserMock).toHaveBeenCalled();
    expect(signOutMock).not.toHaveBeenCalled();
    expect(deleteImagesMock).not.toHaveBeenCalled();
  });
});
