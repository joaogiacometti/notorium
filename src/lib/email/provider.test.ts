import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getServerEnvMock = vi.fn();

vi.mock("@/env", () => ({
  getServerEnv: getServerEnvMock,
}));

describe("sendEmail", () => {
  let tempDir: string | null = null;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    tempDir = await mkdtemp(path.join(os.tmpdir(), "notorium-email-test-"));
  });

  afterEach(async () => {
    vi.unstubAllGlobals();

    if (tempDir) {
      await rm(tempDir, { force: true, recursive: true });
      tempDir = null;
    }
  });

  it("captures email locally in Playwright fixture mode", async () => {
    const inboxPath = path.join(tempDir ?? os.tmpdir(), "inbox.jsonl");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    getServerEnvMock.mockReturnValue({
      NOTORIUM_EMAIL_FIXTURE_MODE: "playwright",
      NOTORIUM_EMAIL_FIXTURE_INBOX_PATH: inboxPath,
    });

    const { sendEmail } = await import("@/lib/email/provider");

    const result = await sendEmail({
      to: "student@example.com",
      subject: "Reset your password",
      html: '<a href="https://app.example.com/reset-password?token=abc">Reset</a>',
    });

    const [line] = (await readFile(inboxPath, "utf8")).trim().split("\n");
    const email = JSON.parse(line ?? "{}") as {
      id?: string;
      to?: string;
      subject?: string;
      html?: string;
    };

    expect(result.success).toBe(true);
    expect(result.success ? result.id : "").toMatch(/^fixture-email-/);
    expect(email).toMatchObject({
      id: result.success ? result.id : "",
      to: "student@example.com",
      subject: "Reset your password",
      html: '<a href="https://app.example.com/reset-password?token=abc">Reset</a>',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends through Resend when fixture mode is disabled", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "email-1" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    getServerEnvMock.mockReturnValue({
      RESEND_API_KEY: "re_test",
      RESEND_FROM_EMAIL: "Notorium <notifications@example.com>",
    });

    const { sendEmail } = await import("@/lib/email/provider");

    const result = await sendEmail({
      to: "student@example.com",
      subject: "Reset your password",
      html: "<p>Reset</p>",
    });

    expect(result).toEqual({ success: true, id: "email-1" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });
});
