import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { decodeReadPayload } from "@/lib/read-api/read-payload";

const { getOptionalSessionMock } = vi.hoisted(() => ({
  getOptionalSessionMock: vi.fn(),
}));

vi.mock("@/lib/auth/auth", () => ({
  getOptionalSession: getOptionalSessionMock,
}));

class FakeDriverError extends Error {
  readonly code = "57014";
}

const approvedSession = {
  user: {
    id: "user-1",
    name: "Ada",
    email: "ada@example.com",
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
  },
};

async function readBody(response: Response): Promise<unknown> {
  return decodeReadPayload(await response.text());
}

describe("runUserReadRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getOptionalSessionMock.mockResolvedValue(approvedSession);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("answers 401 without reading when there is no approved session", async () => {
    getOptionalSessionMock.mockResolvedValue(null);
    const read = vi.fn();
    const { runUserReadRoute } = await import("@/lib/server/read-route");

    const response = await runUserReadRoute({
      logScope: "test.read",
      schema: z.string(),
      input: "x",
      read,
    });

    expect(response.status).toBe(401);
    expect(await readBody(response)).toMatchObject({
      errorCode: "auth.forbidden",
    });
    expect(read).not.toHaveBeenCalled();
  });

  it("answers 400 without reading when the input fails validation", async () => {
    const read = vi.fn();
    const { runUserReadRoute } = await import("@/lib/server/read-route");

    const response = await runUserReadRoute({
      logScope: "test.read",
      schema: z.string().min(1),
      input: "",
      read,
    });

    expect(response.status).toBe(400);
    expect(await readBody(response)).toMatchObject({
      errorCode: "ServerErrors.common.invalidRequest",
    });
    expect(read).not.toHaveBeenCalled();
  });

  it("passes the session user and parsed input, keeping dates intact", async () => {
    const updatedAt = new Date("2026-10-15T00:00:00.000Z");
    const read = vi.fn().mockResolvedValue([{ id: "a", updatedAt }]);
    const { runUserReadRoute } = await import("@/lib/server/read-route");

    const response = await runUserReadRoute({
      logScope: "test.read",
      schema: z.object({ limit: z.number() }),
      input: { limit: 5 },
      read,
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await readBody(response)).toEqual([{ id: "a", updatedAt }]);
    expect(read).toHaveBeenCalledWith(approvedSession.user, { limit: 5 });
  });

  it("answers 404 for a null result when a not-found code is set", async () => {
    const { runUserReadRoute } = await import("@/lib/server/read-route");

    const response = await runUserReadRoute({
      logScope: "test.read",
      schema: z.string(),
      input: "missing",
      read: async () => null,
      notFoundErrorCode: "notes.notFound",
    });

    expect(response.status).toBe(404);
    expect(await readBody(response)).toMatchObject({
      errorCode: "notes.notFound",
    });
  });

  it("answers 500 with a generic code and logs no error message", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const { runUserReadRoute } = await import("@/lib/server/read-route");

    const response = await runUserReadRoute({
      logScope: "notes.byId",
      schema: z.string(),
      input: "n1",
      read: async () => {
        throw new Error("Failed query: params: private text", {
          cause: new FakeDriverError("canceling statement"),
        });
      },
    });

    expect(response.status).toBe(500);
    expect(await readBody(response)).toMatchObject({
      errorCode: "common.generic",
    });
    const logLine = String(consoleErrorSpy.mock.calls[0]?.[0]);
    expect(JSON.parse(logLine)).toEqual({
      event: "read_route_failed",
      scope: "notes.byId",
      errorName: "Error",
      errorCode: "57014",
    });
    expect(logLine).not.toContain("private text");
  });
});

describe("readSearchParams", () => {
  it("coerces number keys, collects array keys, and keeps strings", async () => {
    const { readSearchParams } = await import("@/lib/server/read-route");

    expect(
      readSearchParams(
        "https://app.test/api/x?pageIndex=2&subjectIds=a&subjectIds=b&search=cell",
        { numberKeys: ["pageIndex"], arrayKeys: ["subjectIds"] },
      ),
    ).toEqual({ pageIndex: 2, subjectIds: ["a", "b"], search: "cell" });
  });

  it("turns junk numbers into NaN so numeric schemas reject them", async () => {
    const { readSearchParams } = await import("@/lib/server/read-route");

    const input = readSearchParams("https://app.test/api/x?limit=abc", {
      numberKeys: ["limit"],
    });

    expect(z.object({ limit: z.number() }).safeParse(input).success).toBe(
      false,
    );
  });

  it("omits absent keys", async () => {
    const { readSearchParams } = await import("@/lib/server/read-route");

    expect(readSearchParams("https://app.test/api/x")).toEqual({});
  });
});
