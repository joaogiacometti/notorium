import { beforeEach, describe, expect, it, vi } from "vitest";

const getServerEnvMock = vi.fn();

vi.mock("@/env", () => ({
  getServerEnv: getServerEnvMock,
}));

describe("isEmailDeliveryEnabled", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when Resend API key and from email are configured", async () => {
    getServerEnvMock.mockReturnValue({
      RESEND_API_KEY: "re_test",
      RESEND_FROM_EMAIL: "Notorium <notifications@example.com>",
    });

    const { isEmailDeliveryEnabled } = await import("@/lib/email/config");

    expect(isEmailDeliveryEnabled()).toBe(true);
  });

  it("returns false when Resend API key is missing", async () => {
    getServerEnvMock.mockReturnValue({
      RESEND_API_KEY: undefined,
      RESEND_FROM_EMAIL: "Notorium <notifications@example.com>",
    });

    const { isEmailDeliveryEnabled } = await import("@/lib/email/config");

    expect(isEmailDeliveryEnabled()).toBe(false);
  });

  it("returns false when Resend from email is missing", async () => {
    getServerEnvMock.mockReturnValue({
      RESEND_API_KEY: "re_test",
      RESEND_FROM_EMAIL: undefined,
    });

    const { isEmailDeliveryEnabled } = await import("@/lib/email/config");

    expect(isEmailDeliveryEnabled()).toBe(false);
  });
});
