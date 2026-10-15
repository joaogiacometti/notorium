import { beforeEach, describe, expect, it, vi } from "vitest";

const { cookieSetMock } = vi.hoisted(() => ({
  cookieSetMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ set: cookieSetMock }),
}));

describe("setSidebarCollapsed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a non-boolean value without writing the cookie", async () => {
    const { setSidebarCollapsed } = await import("@/app/actions/sidebar");

    await expect(
      setSidebarCollapsed("yes" as unknown as boolean),
    ).rejects.toThrow();
    expect(cookieSetMock).not.toHaveBeenCalled();
  });

  it("persists the collapsed state cookie", async () => {
    const { setSidebarCollapsed } = await import("@/app/actions/sidebar");

    await setSidebarCollapsed(true);

    expect(cookieSetMock).toHaveBeenCalledWith(
      "notorium:sidebar-collapsed",
      "true",
      expect.objectContaining({ path: "/" }),
    );
  });
});
