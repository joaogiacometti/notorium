import { beforeEach, describe, expect, it, vi } from "vitest";

const executeMock = vi.fn();
const stateLimitMock = vi.fn();
const stateWhereMock = vi.fn(() => ({
  limit: stateLimitMock,
}));
const stateFromMock = vi.fn(() => ({
  where: stateWhereMock,
}));
const adminLimitMock = vi.fn();
const adminOrderByMock = vi.fn(() => ({
  limit: adminLimitMock,
}));
const adminWhereMock = vi.fn(() => ({
  orderBy: adminOrderByMock,
}));
const adminFromMock = vi.fn(() => ({
  where: adminWhereMock,
}));
const earliestLimitMock = vi.fn();
const earliestOrderByMock = vi.fn(() => ({
  limit: earliestLimitMock,
}));
const earliestFromMock = vi.fn(() => ({
  orderBy: earliestOrderByMock,
}));
const selectMock = vi.fn();
const insertValuesMock = vi.fn();
const insertMock = vi.fn(() => ({
  values: insertValuesMock,
}));
const updateWhereMock = vi.fn();
const updateSetMock = vi.fn(() => ({
  where: updateWhereMock,
}));
const updateMock = vi.fn(() => ({
  set: updateSetMock,
}));
const transactionMock = vi.fn();
const eqMock = vi.fn((column, value) => ({ column, value }));
const ascMock = vi.fn((column) => column);
const sqlMock = Object.assign(
  vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
    strings,
    values,
  })),
  {},
);

vi.mock("@/db/index", () => ({
  getDb: () => ({
    transaction: transactionMock,
  }),
}));

vi.mock("drizzle-orm", () => ({
  asc: ascMock,
  eq: eqMock,
  sql: sqlMock,
}));

vi.mock("@/db/schema", () => ({
  instanceState: {
    id: "instance_state_id_column",
    initialAdminUserId: "instance_state_initial_admin_user_id_column",
  },
  user: {
    id: "user_id_column",
    isAdmin: "user_is_admin_column",
    createdAt: "user_created_at_column",
  },
}));

describe("claimInitialAdminAccess", () => {
  beforeEach(() => {
    executeMock.mockReset();
    stateLimitMock.mockReset();
    stateWhereMock.mockClear();
    stateFromMock.mockClear();
    adminLimitMock.mockReset();
    adminOrderByMock.mockClear();
    adminWhereMock.mockClear();
    adminFromMock.mockClear();
    earliestLimitMock.mockReset();
    earliestOrderByMock.mockClear();
    earliestFromMock.mockClear();
    selectMock.mockReset();
    insertValuesMock.mockReset();
    insertMock.mockClear();
    updateWhereMock.mockReset();
    updateSetMock.mockClear();
    updateMock.mockClear();
    transactionMock.mockReset();
    eqMock.mockClear();
    ascMock.mockClear();
    sqlMock.mockClear();

    selectMock
      .mockImplementationOnce(() => ({
        from: stateFromMock,
      }))
      .mockImplementationOnce(() => ({
        from: adminFromMock,
      }))
      .mockImplementationOnce(() => ({
        from: earliestFromMock,
      }));

    transactionMock.mockImplementation(async (callback) =>
      callback({
        execute: executeMock,
        select: selectMock,
        insert: insertMock,
        update: updateMock,
      }),
    );
  });

  it("promotes the earliest user and records bootstrap state when no initial admin exists", async () => {
    stateLimitMock.mockResolvedValueOnce([]);
    adminLimitMock.mockResolvedValueOnce([]);
    earliestLimitMock.mockResolvedValueOnce([{ id: "user-1" }]);

    const { claimInitialAdminAccess } = await import(
      "@/features/auth/mutations"
    );

    await expect(claimInitialAdminAccess("user-1")).resolves.toBe(true);

    expect(executeMock).toHaveBeenCalledTimes(1);
    expect(updateSetMock).toHaveBeenCalledWith({
      accessStatus: "approved",
      isAdmin: true,
    });
    expect(updateWhereMock).toHaveBeenCalledWith({
      column: "user_id_column",
      value: "user-1",
    });
    expect(insertValuesMock).toHaveBeenCalledWith({
      id: "primary",
      initialAdminUserId: "user-1",
      initialAdminAssignedAt: expect.any(Date),
    });
  });

  it("backfills bootstrap state from an existing admin without promoting another user", async () => {
    stateLimitMock.mockResolvedValueOnce([]);
    adminLimitMock.mockResolvedValueOnce([{ id: "admin-1" }]);

    const { claimInitialAdminAccess } = await import(
      "@/features/auth/mutations"
    );

    await expect(claimInitialAdminAccess("user-2")).resolves.toBe(false);

    expect(updateMock).not.toHaveBeenCalled();
    expect(insertValuesMock).toHaveBeenCalledWith({
      id: "primary",
      initialAdminUserId: "admin-1",
      initialAdminAssignedAt: expect.any(Date),
    });
  });

  it("returns true immediately when the bootstrap state already belongs to the current user", async () => {
    stateLimitMock.mockResolvedValueOnce([{ initialAdminUserId: "user-1" }]);

    const { claimInitialAdminAccess } = await import(
      "@/features/auth/mutations"
    );

    await expect(claimInitialAdminAccess("user-1")).resolves.toBe(true);

    expect(insertMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });
});
