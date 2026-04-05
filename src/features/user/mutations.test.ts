import { beforeEach, describe, expect, it, vi } from "vitest";

const limitMock = vi.fn();
const selectWhereMock = vi.fn(() => ({
  limit: limitMock,
}));
const updateWhereMock = vi.fn();
const selectMock = vi.fn(() => ({
  from: () => ({
    where: selectWhereMock,
  }),
}));
const updateSetMock = vi.fn(() => ({
  where: updateWhereMock,
}));
const updateMock = vi.fn(() => ({
  set: updateSetMock,
}));
const eqMock = vi.fn((column, value) => ({ column, value }));

vi.mock("@/db/index", () => ({
  getDb: () => ({
    select: selectMock,
    update: updateMock,
  }),
}));

vi.mock("drizzle-orm", () => ({
  eq: eqMock,
}));

vi.mock("@/db/schema", () => ({
  user: {
    id: "user_id_column",
    preferredTheme: "user_preferred_theme_column",
    accessStatus: "user_access_status_column",
  },
}));

describe("updateUserTheme", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates the user theme", async () => {
    updateWhereMock.mockResolvedValueOnce(undefined);

    const { updateUserTheme } = await import("@/features/user/mutations");
    await updateUserTheme("user-1", "dark");

    expect(updateMock).toHaveBeenCalled();
  });
});

describe("updateUserAccessStatusForUser", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns unauthorized when caller is not admin", async () => {
    vi.doMock("@/lib/auth/access-control", () => ({
      isAdminUser: vi.fn().mockResolvedValue(false),
    }));

    const { updateUserAccessStatusForUser } = await import(
      "@/features/user/mutations"
    );
    const result = await updateUserAccessStatusForUser("user-1", {
      userId: "user-2",
      accessStatus: "approved",
    });

    expect(result).toHaveProperty("success", false);
    expect(result).toHaveProperty("errorCode", "auth.unauthorized");
  });

  it("returns error when target user does not exist", async () => {
    vi.doMock("@/lib/auth/access-control", () => ({
      isAdminUser: vi.fn().mockResolvedValue(true),
    }));
    limitMock.mockResolvedValueOnce([]);

    const { updateUserAccessStatusForUser } = await import(
      "@/features/user/mutations"
    );
    const result = await updateUserAccessStatusForUser("admin-1", {
      userId: "missing-user",
      accessStatus: "approved",
    });

    expect(result).toHaveProperty("success", false);
    expect(result).toHaveProperty("errorCode", "auth.userNotFound");
  });

  it("succeeds when admin updates an existing user", async () => {
    vi.doMock("@/lib/auth/access-control", () => ({
      isAdminUser: vi.fn().mockResolvedValue(true),
    }));
    limitMock.mockResolvedValueOnce([{ id: "user-2" }]);
    updateWhereMock.mockResolvedValueOnce(undefined);

    const { updateUserAccessStatusForUser } = await import(
      "@/features/user/mutations"
    );
    const result = await updateUserAccessStatusForUser("admin-1", {
      userId: "user-2",
      accessStatus: "approved",
    });

    expect(result).toHaveProperty("success", true);
  });
});
