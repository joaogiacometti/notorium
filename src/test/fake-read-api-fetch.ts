import { vi } from "vitest";
import { encodeReadPayload } from "@/lib/read-api/read-payload";

interface FakeReadApiReply {
  status: number;
  body: string;
}

/**
 * Stands in for `fetch` in read-api client tests: records requested URLs and
 * answers with queued replies (JSON-encoded like a real read route). Install
 * with `install()` and pair it with `vi.unstubAllGlobals()` in `afterEach`.
 *
 * @example
 * const server = new FakeReadApiFetch().install();
 * server.replyJson(200, [{ id: "a" }]);
 * await fetchReadApi("/api/x");
 * expect(server.requestedUrls).toEqual(["/api/x"]);
 */
export class FakeReadApiFetch {
  readonly requestedUrls: string[] = [];
  private readonly replies: FakeReadApiReply[] = [];

  install(): this {
    vi.stubGlobal("fetch", (url: string) => this.respond(url));
    return this;
  }

  replyJson(status: number, body: unknown): this {
    this.replies.push({ status, body: encodeReadPayload(body) });
    return this;
  }

  replyText(status: number, body: string): this {
    this.replies.push({ status, body });
    return this;
  }

  private async respond(url: string): Promise<Response> {
    this.requestedUrls.push(url);
    const reply = this.replies.shift();
    if (!reply) {
      throw new Error(`FakeReadApiFetch has no queued reply for ${url}`);
    }

    return new Response(reply.body, { status: reply.status });
  }
}
