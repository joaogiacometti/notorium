import { beforeEach, describe, expect, it, vi } from "vitest";

const { getFsrsOptimizationSettingsMock, areWorkflowsEnabledMock } = vi.hoisted(
  () => ({
    getFsrsOptimizationSettingsMock: vi.fn(),
    areWorkflowsEnabledMock: vi.fn(),
  }),
);

vi.mock("@/features/flashcards/fsrs/settings-queries", () => ({
  getFsrsOptimizationSettings: getFsrsOptimizationSettingsMock,
}));

vi.mock("@/lib/workflows/config", () => ({
  areWorkflowsEnabled: areWorkflowsEnabledMock,
}));

const sessionUser = {
  id: "user-1",
  name: "Ada",
  email: "ada@example.com",
  createdAt: new Date("2024-01-02T00:00:00.000Z"),
};

describe("getAccountSettingsForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("bundles session, config flags, and FSRS settings for the settings dialog", async () => {
    areWorkflowsEnabledMock.mockReturnValue(false);
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
      email: "ada@example.com",
      createdAt: "2024-01-02T00:00:00.000Z",
      workflowsEnabled: false,
      fsrsOptimization: {
        automaticOptimizationEnabled: false,
        lastOptimizedAt: null,
        optimizedReviewCount: 0,
        reviewCount: 12,
      },
    });
    expect(getFsrsOptimizationSettingsMock).toHaveBeenCalledWith("user-1");
  });
});
