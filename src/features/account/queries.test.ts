import { beforeEach, describe, expect, it, vi } from "vitest";

const { getFsrsOptimizationSettingsMock } = vi.hoisted(() => ({
  getFsrsOptimizationSettingsMock: vi.fn(),
}));

vi.mock("@/features/flashcards/fsrs/settings-queries", () => ({
  getFsrsOptimizationSettings: getFsrsOptimizationSettingsMock,
  readFsrsSettings: async () => ({ newCardsPerDay: 15 }),
}));

const sessionUser = {
  id: "user-1",
  name: "Ada",
  email: "ada@example.com",
  timeZone: "America/Sao_Paulo",
  createdAt: new Date("2024-01-02T00:00:00.000Z"),
};

describe("getAccountSettingsForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the optimization date in the same zone as the membership date", async () => {
    getFsrsOptimizationSettingsMock.mockResolvedValue({
      lastOptimizedAt: "2026-01-01T01:30:00Z",
    });
    const { getAccountSettingsForUser } = await import(
      "@/features/account/queries"
    );
    const settings = await getAccountSettingsForUser(sessionUser);
    expect(settings.fsrsOptimization.lastOptimizedOn).toBe("December 31, 2025");
  });

  it("bundles session and FSRS settings for the settings dialog", async () => {
    getFsrsOptimizationSettingsMock.mockResolvedValue({
      automaticOptimizationEnabled: false,
      lastOptimizedAt: null,
      optimizedReviewCount: 0,
      reviewCount: 12,
    });

    const { getAccountSettingsForUser } = await import(
      "@/features/account/queries"
    );
    const result = await getAccountSettingsForUser(sessionUser);

    expect(result).toEqual({
      name: "Ada",
      memberSince: "January 1, 2024",
      email: "ada@example.com",
      createdAt: "2024-01-02T00:00:00.000Z",
      timeZone: "America/Sao_Paulo",
      timeZoneOptions: expect.arrayContaining(["UTC", "Asia/Tokyo"]),
      newCardsPerDay: 15,
      fsrsOptimization: {
        lastOptimizedOn: null,
        automaticOptimizationEnabled: false,
        lastOptimizedAt: null,
        optimizedReviewCount: 0,
        reviewCount: 12,
      },
    });
    expect(getFsrsOptimizationSettingsMock).toHaveBeenCalledWith("user-1");
  });
});
