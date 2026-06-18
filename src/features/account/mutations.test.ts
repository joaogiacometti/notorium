import { beforeEach, describe, expect, it, vi } from "vitest";

const signOutMock = vi.fn();
const deleteUserMock = vi.fn();
const getMediaStorageProviderMock = vi.fn();
const deleteImagesMock = vi.fn();
const listImagePathnamesMock = vi.fn();
const headersMock = vi.fn();

const { cleanupAttachmentPathnamesMock, listAccountAttachmentPathnamesMock } =
  vi.hoisted(() => ({
    cleanupAttachmentPathnamesMock: vi.fn(),
    listAccountAttachmentPathnamesMock: vi.fn(),
  }));

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
}));

vi.mock("@/lib/media-storage/provider", () => ({
  getMediaStorageProvider: getMediaStorageProviderMock,
}));

vi.mock("@/features/attachments/cleanup", () => ({
  cleanupAttachmentPathnames: cleanupAttachmentPathnamesMock,
  listAccountAttachmentPathnames: listAccountAttachmentPathnamesMock,
  getSubjectAttachmentPathnamesForUser: vi.fn(),
  getDeckAttachmentPathnamesForUser: vi.fn(),
}));

const ATTACHMENT_CONTEXTS = ["notes", "flashcards", "assessments", "mindmaps"];

describe("deleteAccountForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    headersMock.mockResolvedValue(new Headers());
    signOutMock.mockResolvedValue(undefined);
    deleteUserMock.mockResolvedValue(undefined);
    deleteImagesMock.mockResolvedValue(undefined);
    listImagePathnamesMock.mockReset();
    getMediaStorageProviderMock.mockResolvedValue({
      deleteImages: deleteImagesMock,
      listImagePathnames: listImagePathnamesMock,
    });

    cleanupAttachmentPathnamesMock.mockImplementation(
      async (_userId: string, pathnames: string[]) => {
        if (pathnames.length === 0) {
          return;
        }

        const provider = await getMediaStorageProviderMock();

        if (!provider) {
          return;
        }

        try {
          await provider.deleteImages({ pathnames });
        } catch {
          // silently ignore cleanup failures
        }
      },
    );

    listAccountAttachmentPathnamesMock.mockImplementation(
      async (provider: Record<string, unknown>, userId: string) => {
        const results = await Promise.all(
          ATTACHMENT_CONTEXTS.map(async (context) => {
            const result = await (
              provider.listImagePathnames as (args: {
                prefix: string;
              }) => Promise<string[] | undefined>
            )({
              prefix: `notorium/${context}/${userId}/`,
            });

            return result ?? [];
          }),
        );

        return results.flat();
      },
    );
  });

  it("deletes the user before cleaning up owned note and flashcard blobs", async () => {
    listImagePathnamesMock
      .mockResolvedValueOnce(["notorium/notes/user-1/a.png"])
      .mockResolvedValueOnce(["notorium/flashcards/user-1/b.png"])
      .mockResolvedValueOnce(["notorium/assessments/user-1/c.pdf"]);

    const { deleteAccountForUser } = await import(
      "@/features/account/mutations"
    );

    const result = await deleteAccountForUser("user-1");

    expect(result).toEqual({ success: true });
    expect(deleteImagesMock).toHaveBeenCalledWith({
      pathnames: [
        "notorium/notes/user-1/a.png",
        "notorium/flashcards/user-1/b.png",
        "notorium/assessments/user-1/c.pdf",
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

    const result = await deleteAccountForUser("user-1");

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

    const result = await deleteAccountForUser("user-1");

    expect(result).toEqual({ success: true });
    expect(deleteUserMock).toHaveBeenCalled();
    expect(deleteImagesMock).not.toHaveBeenCalled();
    expect(signOutMock).not.toHaveBeenCalled();
  });

  it("returns success when blob cleanup fails after deleting the user", async () => {
    listImagePathnamesMock
      .mockResolvedValueOnce(["notorium/notes/user-1/a.png"])
      .mockResolvedValueOnce(["notorium/flashcards/user-1/b.png"])
      .mockResolvedValueOnce(["notorium/assessments/user-1/c.pdf"]);
    deleteImagesMock.mockRejectedValueOnce(new Error("cleanup failed"));

    const { deleteAccountForUser } = await import(
      "@/features/account/mutations"
    );

    const result = await deleteAccountForUser("user-1");

    expect(result).toEqual({ success: true });
    expect(deleteUserMock).toHaveBeenCalled();
    expect(signOutMock).not.toHaveBeenCalled();
    expect(deleteImagesMock).toHaveBeenCalledWith({
      pathnames: [
        "notorium/notes/user-1/a.png",
        "notorium/flashcards/user-1/b.png",
        "notorium/assessments/user-1/c.pdf",
      ],
    });
  });

  it("returns an error when auth deletion fails and skips blob cleanup", async () => {
    listImagePathnamesMock
      .mockResolvedValueOnce(["notorium/notes/user-1/a.png"])
      .mockResolvedValueOnce(["notorium/flashcards/user-1/b.png"])
      .mockResolvedValueOnce(["notorium/assessments/user-1/c.pdf"]);
    deleteUserMock.mockRejectedValueOnce(new Error("auth failed"));

    const { deleteAccountForUser } = await import(
      "@/features/account/mutations"
    );

    const result = await deleteAccountForUser("user-1");

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
