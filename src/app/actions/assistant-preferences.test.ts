import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TutoringMode } from "@/features/assistant/validation";

const { cookieSetMock } = vi.hoisted(() => ({
  cookieSetMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ set: cookieSetMock }),
}));

describe("setTutoringModePreference", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects an unknown mode without writing the cookie", async () => {
    const { setTutoringModePreference } = await import(
      "@/app/actions/assistant-preferences"
    );

    await expect(
      setTutoringModePreference("cheat" as TutoringMode),
    ).rejects.toThrow();
    expect(cookieSetMock).not.toHaveBeenCalled();
  });

  it("persists the tutoring mode cookie", async () => {
    const { setTutoringModePreference } = await import(
      "@/app/actions/assistant-preferences"
    );

    await setTutoringModePreference("answers");

    expect(cookieSetMock).toHaveBeenCalledWith(
      "notorium:assistant-tutoring",
      "answers",
      expect.objectContaining({ path: "/" }),
    );
  });
});
