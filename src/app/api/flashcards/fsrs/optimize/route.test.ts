import { beforeEach, describe, expect, it, vi } from "vitest";

const getServerEnvMock = vi.fn();
const optimizeAutomaticFsrsParametersMock = vi.fn();

vi.mock("@/env", () => ({
  getServerEnv: getServerEnvMock,
}));

vi.mock("@/features/flashcards/fsrs/settings", () => ({
  optimizeAutomaticFsrsParameters: optimizeAutomaticFsrsParametersMock,
}));

function getRouteRequest(authorization?: string) {
  return new Request("http://localhost/api/flashcards/fsrs/optimize", {
    headers: authorization ? { authorization } : undefined,
  });
}

describe("GET /api/flashcards/fsrs/optimize", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getServerEnvMock.mockReturnValue({
      CRON_SECRET: "12345678901234567890123456789012",
    });
    optimizeAutomaticFsrsParametersMock.mockResolvedValue({
      attempted: 2,
      optimized: 1,
      skipped: 1,
    });
  });

  it("returns 503 when the cron secret is not configured", async () => {
    getServerEnvMock.mockReturnValueOnce({
      CRON_SECRET: undefined,
    });

    const { GET } = await import("@/app/api/flashcards/fsrs/optimize/route");
    const response = await GET(getRouteRequest());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Cron endpoint is not configured.",
    });
    expect(optimizeAutomaticFsrsParametersMock).not.toHaveBeenCalled();
  });

  it("returns 401 when the authorization header is invalid", async () => {
    const { GET } = await import("@/app/api/flashcards/fsrs/optimize/route");
    const response = await GET(getRouteRequest("Bearer wrong-secret"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Unauthorized.",
    });
    expect(optimizeAutomaticFsrsParametersMock).not.toHaveBeenCalled();
  });

  it("returns the automatic optimization summary when authorized", async () => {
    const { GET } = await import("@/app/api/flashcards/fsrs/optimize/route");
    const response = await GET(
      getRouteRequest("Bearer 12345678901234567890123456789012"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      attempted: 2,
      optimized: 1,
      skipped: 1,
    });
    expect(optimizeAutomaticFsrsParametersMock).toHaveBeenCalledTimes(1);
  });
});
