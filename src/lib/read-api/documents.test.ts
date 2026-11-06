import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchFolderDocuments, fetchNoteById } from "@/lib/read-api/documents";
import { FakeReadApiFetch } from "@/test/fake-read-api-fetch";

describe("document read-api fetchers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests a folder's documents with an encoded id", async () => {
    const server = new FakeReadApiFetch()
      .install()
      .replyJson(200, [{ id: "n1" }]);

    await expect(fetchFolderDocuments("a b")).resolves.toEqual([{ id: "n1" }]);
    expect(server.requestedUrls).toEqual(["/api/folders/a%20b/documents"]);
  });

  it("returns null for a deleted note", async () => {
    new FakeReadApiFetch()
      .install()
      .replyJson(404, { errorCode: "notes.notFound" });

    await expect(fetchNoteById("n1")).resolves.toBeNull();
  });
});
