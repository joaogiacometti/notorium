import { beforeEach, describe, expect, it, vi } from "vitest";

const getServerEnvMock = vi.fn();
const sendAssessmentReminderEmailsMock = vi.fn();

vi.mock("@/env", () => ({
  getServerEnv: getServerEnvMock,
}));

vi.mock("@/features/notifications/email-service", () => ({
  sendAssessmentReminderEmails: sendAssessmentReminderEmailsMock,
}));

function getRouteRequest(authorization?: string) {
  return new Request("http://localhost/api/notifications/assessments", {
    headers: authorization ? { authorization } : undefined,
  });
}

describe("GET /api/notifications/assessments", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getServerEnvMock.mockReturnValue({
      CRON_SECRET: "12345678901234567890123456789012",
      RESEND_API_KEY: "re_test",
      RESEND_FROM_EMAIL: "notifications@example.com",
    });
    sendAssessmentReminderEmailsMock.mockResolvedValue({
      sent: 1,
      failed: 0,
    });
  });

  it("returns 503 when the cron secret is not configured", async () => {
    getServerEnvMock.mockReturnValueOnce({
      CRON_SECRET: undefined,
      RESEND_API_KEY: "re_test",
      RESEND_FROM_EMAIL: "notifications@example.com",
    });

    const { GET } = await import("@/app/api/notifications/assessments/route");
    const response = await GET(getRouteRequest());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Cron endpoint is not configured.",
    });
    expect(sendAssessmentReminderEmailsMock).not.toHaveBeenCalled();
  });

  it("returns 503 when email notifications are not configured", async () => {
    getServerEnvMock.mockReturnValueOnce({
      CRON_SECRET: "12345678901234567890123456789012",
      RESEND_API_KEY: undefined,
      RESEND_FROM_EMAIL: "notifications@example.com",
    });

    const { GET } = await import("@/app/api/notifications/assessments/route");
    const response = await GET(
      getRouteRequest("Bearer 12345678901234567890123456789012"),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Email notifications are not configured.",
    });
    expect(sendAssessmentReminderEmailsMock).not.toHaveBeenCalled();
  });

  it("returns 401 when the authorization header is invalid", async () => {
    const { GET } = await import("@/app/api/notifications/assessments/route");
    const response = await GET(getRouteRequest("Bearer wrong-secret"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Unauthorized.",
    });
    expect(sendAssessmentReminderEmailsMock).not.toHaveBeenCalled();
  });

  it("returns the notification batch result when the request is authorized", async () => {
    const { GET } = await import("@/app/api/notifications/assessments/route");
    const response = await GET(
      getRouteRequest("Bearer 12345678901234567890123456789012"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      sent: 1,
      failed: 0,
    });
    expect(sendAssessmentReminderEmailsMock).toHaveBeenCalledTimes(1);
  });
});
