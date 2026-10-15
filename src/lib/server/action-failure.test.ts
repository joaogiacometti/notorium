import { notFound, redirect } from "next/navigation";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runCatchingActionFailure } from "@/lib/server/action-failure";

class FakeDriverError extends Error {
  readonly code = "23505";
}

describe("runCatchingActionFailure", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("passes the action result through when nothing throws", async () => {
    const result = await runCatchingActionFailure("notes.read", async () => ({
      success: true as const,
    }));

    expect(result).toEqual({ success: true });
  });

  it("returns a generic action error instead of the thrown error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await runCatchingActionFailure("notes.read", async () => {
      throw new Error("Failed query: select ... params: private text");
    });

    expect(result).toEqual({
      success: false,
      errorCode: "common.generic",
      errorParams: undefined,
      errorMessage: undefined,
    });
  });

  it("logs scope, error class, and driver code but never the message", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await runCatchingActionFailure("subjects.create", async () => {
      throw new Error("Failed query: params: private text", {
        cause: new FakeDriverError("duplicate key (name)=(private text)"),
      });
    });

    const logLine = String(consoleErrorSpy.mock.calls[0]?.[0]);
    expect(JSON.parse(logLine)).toEqual({
      event: "server_action_failed",
      scope: "subjects.create",
      errorName: "Error",
      errorCode: "23505",
    });
    expect(logLine).not.toContain("private text");
  });

  it("rethrows Next.js redirects so auth redirects still work", async () => {
    await expect(
      runCatchingActionFailure("notes.read", () => redirect("/login")),
    ).rejects.toThrow("NEXT_REDIRECT");
  });

  it("rethrows Next.js notFound", async () => {
    await expect(
      runCatchingActionFailure("notes.read", () => notFound()),
    ).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
  });

  it("reads the driver code from an error without a cause", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await runCatchingActionFailure("subjects.create", async () => {
      throw new FakeDriverError("connection refused");
    });

    expect(
      JSON.parse(String(consoleErrorSpy.mock.calls[0]?.[0])),
    ).toMatchObject({ errorCode: "23505" });
  });
});
