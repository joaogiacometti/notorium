import { beforeEach, describe, expect, it, vi } from "vitest";

const deleteUserMock = vi.fn();
const headersMock = vi.fn();

const { purgeUserBlobsMock } = vi.hoisted(() => ({
  purgeUserBlobsMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("@/lib/auth/auth", () => ({
  getAuth: () => ({
    api: {
      deleteUser: deleteUserMock,
    },
  }),
}));

vi.mock("@/features/attachments/blob-gc", () => ({
  purgeUserBlobs: purgeUserBlobsMock,
}));

describe("deleteAccountForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    headersMock.mockResolvedValue(new Headers());
    deleteUserMock.mockResolvedValue(undefined);
    purgeUserBlobsMock.mockResolvedValue(undefined);
  });

  it("deletes the user before purging their blobs", async () => {
    const { deleteAccountForUser } = await import(
      "@/features/account/mutations"
    );

    const result = await deleteAccountForUser("user-1");

    expect(result).toEqual({ success: true });
    expect(deleteUserMock).toHaveBeenCalled();
    expect(purgeUserBlobsMock).toHaveBeenCalledWith("user-1");
    expect(deleteUserMock.mock.invocationCallOrder[0]).toBeLessThan(
      purgeUserBlobsMock.mock.invocationCallOrder[0],
    );
  });

  it("returns an error and skips blob purge when auth deletion fails", async () => {
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
    expect(purgeUserBlobsMock).not.toHaveBeenCalled();
  });
});
