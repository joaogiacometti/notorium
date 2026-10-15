// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildReadApiUrl,
  fetchReadApi,
  fetchReadApiOrNull,
  fetchReadApiResult,
  ReadApiError,
} from "@/lib/read-api/read-api-client";
import { FakeReadApiFetch } from "@/test/fake-read-api-fetch";
import { stubWindowLocationAssign } from "@/test/fake-window-location";

const notFoundBody = { success: false, errorCode: "notes.notFound" };

describe("buildReadApiUrl", () => {
  it("drops undefined values and repeats array keys", () => {
    expect(
      buildReadApiUrl("/api/x", {
        q: "a b",
        page: 2,
        skipped: undefined,
        ids: ["s1", "s2"],
      }),
    ).toBe("/api/x?q=a+b&page=2&ids=s1&ids=s2");
  });

  it("returns the bare path when no value is set", () => {
    expect(buildReadApiUrl("/api/x", { q: undefined })).toBe("/api/x");
  });
});

describe("read-api client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the decoded body with dates revived", async () => {
    const updatedAt = new Date("2026-10-15T00:00:00.000Z");
    const server = new FakeReadApiFetch()
      .install()
      .replyJson(200, [{ updatedAt }]);

    const body = await fetchReadApi<{ updatedAt: Date }[]>("/api/x", {
      q: "cell",
    });

    expect(body[0]?.updatedAt).toEqual(updatedAt);
    expect(server.requestedUrls).toEqual(["/api/x?q=cell"]);
  });

  it("throws a ReadApiError carrying the status and error code", async () => {
    new FakeReadApiFetch().install().replyJson(404, notFoundBody);

    await expect(fetchReadApi("/api/notes/n1")).rejects.toMatchObject({
      name: "ReadApiError",
      status: 404,
      errorCode: "notes.notFound",
    });
  });

  it("falls back to common.generic when the error body is not ours", async () => {
    new FakeReadApiFetch().install().replyText(502, "<html>Bad gateway</html>");

    const error: unknown = await fetchReadApi("/api/x").catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(ReadApiError);
    expect((error as ReadApiError).errorCode).toBe("common.generic");
  });

  it("returns the error result instead of throwing for result callers", async () => {
    new FakeReadApiFetch()
      .install()
      .replyJson(400, { errorCode: "ServerErrors.common.invalidRequest" });

    await expect(fetchReadApiResult("/api/x")).resolves.toEqual({
      errorCode: "ServerErrors.common.invalidRequest",
    });
  });

  it("maps a 404 to null and rethrows other failures", async () => {
    new FakeReadApiFetch()
      .install()
      .replyJson(404, notFoundBody)
      .replyJson(500, { errorCode: "common.generic" });

    await expect(fetchReadApiOrNull("/api/notes/n1")).resolves.toBeNull();
    await expect(fetchReadApiOrNull("/api/notes/n1")).rejects.toBeInstanceOf(
      ReadApiError,
    );
  });

  it("sends an expired session to /login like Server Actions did", async () => {
    const assignSpy = stubWindowLocationAssign();
    new FakeReadApiFetch()
      .install()
      .replyJson(401, { errorCode: "auth.forbidden" });

    await expect(fetchReadApi("/api/x")).rejects.toMatchObject({ status: 401 });
    expect(assignSpy).toHaveBeenCalledWith("/login");
  });

  it("throws when a success body is not valid JSON", async () => {
    new FakeReadApiFetch().install().replyText(200, "not json");

    await expect(fetchReadApi("/api/x")).rejects.toThrow(SyntaxError);
  });
});
