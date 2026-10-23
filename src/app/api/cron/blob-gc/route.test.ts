import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BlobSweepReport } from "@/features/attachments/blob-gc";

const { getServerEnvMock, sweepOrphanBlobsMock } = vi.hoisted(() => ({
  getServerEnvMock: vi.fn(),
  sweepOrphanBlobsMock: vi.fn(),
}));

vi.mock("@/env", () => ({ getServerEnv: getServerEnvMock }));
vi.mock("@/features/attachments/blob-gc", () => ({
  sweepOrphanBlobs: sweepOrphanBlobsMock,
}));

const REPORT: BlobSweepReport = {
  scanned: 2,
  referenced: 1,
  orphaned: 1,
  skippedTooNew: 0,
  deleted: 1,
  dryRun: false,
  aborted: false,
};

class SweepRequestFake extends Request {
  constructor(query = "", authorized = true) {
    super(`http://localhost/api/cron/blob-gc${query}`, {
      headers: authorized
        ? { authorization: "Bearer fixture-cron-secret" }
        : {},
    });
  }
}

describe("GET /api/cron/blob-gc", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getServerEnvMock.mockReturnValue({ CRON_SECRET: "fixture-cron-secret" });
    sweepOrphanBlobsMock.mockResolvedValue(REPORT);
  });

  it("rejects unauthenticated requests without sweeping", async () => {
    const { GET } = await import("@/app/api/cron/blob-gc/route");
    expect((await GET(new SweepRequestFake("", false))).status).toBe(401);
    expect(sweepOrphanBlobsMock).not.toHaveBeenCalled();
  });

  it("requires cron configuration before sweeping", async () => {
    getServerEnvMock.mockReturnValue({});
    const { GET } = await import("@/app/api/cron/blob-gc/route");
    expect((await GET(new SweepRequestFake())).status).toBe(503);
    expect(sweepOrphanBlobsMock).not.toHaveBeenCalled();
  });

  it("returns the sweep report to an authorized caller", async () => {
    const { GET } = await import("@/app/api/cron/blob-gc/route");
    const response = await GET(new SweepRequestFake());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(REPORT);
    expect(sweepOrphanBlobsMock).toHaveBeenCalledWith({ dryRun: false });
  });

  it("passes dry-run requests through without enabling deletion", async () => {
    sweepOrphanBlobsMock.mockResolvedValue({
      ...REPORT,
      dryRun: true,
      deleted: 0,
    });
    const { GET } = await import("@/app/api/cron/blob-gc/route");
    const response = await GET(new SweepRequestFake("?dryRun=1"));
    expect(response.status).toBe(200);
    expect(sweepOrphanBlobsMock).toHaveBeenCalledWith({ dryRun: true });
    await expect(response.json()).resolves.toMatchObject({ deleted: 0 });
  });

  it("reports unavailable storage", async () => {
    sweepOrphanBlobsMock.mockResolvedValue(null);
    const { GET } = await import("@/app/api/cron/blob-gc/route");
    expect((await GET(new SweepRequestFake())).status).toBe(503);
  });

  it("returns a failure status when the safety brake blocks cleanup", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    sweepOrphanBlobsMock.mockResolvedValue({
      ...REPORT,
      aborted: true,
      deleted: 0,
    });
    const { GET } = await import("@/app/api/cron/blob-gc/route");
    const response = await GET(new SweepRequestFake());
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      aborted: true,
      deleted: 0,
    });
    log.mockRestore();
  });

  it("returns a generic error when the sweep fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    sweepOrphanBlobsMock.mockRejectedValue(
      new Error("Reference read unavailable"),
    );
    const { GET } = await import("@/app/api/cron/blob-gc/route");
    const response = await GET(new SweepRequestFake());
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Internal error while sweeping orphaned blobs.",
    });
    log.mockRestore();
  });
});
