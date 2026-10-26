import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchFlashcardContents,
  fetchFlashcardForManage,
  fetchFlashcardsManagePage,
  fetchStrugglingFlashcards,
} from "@/lib/read-api/flashcards";
import { FakeReadApiFetch } from "@/test/fake-read-api-fetch";

describe("flashcard read-api fetchers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns a found flashcard and rejects a missing one", async () => {
    const server = new FakeReadApiFetch()
      .install()
      .replyJson(200, { id: "c/1" })
      .replyJson(404, { errorCode: "flashcards.notFound" });

    await expect(fetchFlashcardForManage("c/1")).resolves.toEqual({
      id: "c/1",
    });
    await expect(fetchFlashcardForManage("c/1")).rejects.toMatchObject({
      status: 404,
      errorCode: "flashcards.notFound",
    });
    expect(server.requestedUrls[0]).toBe("/api/flashcards/c%2F1");
  });

  it("rejects a failed manage-page read instead of returning empty cards", async () => {
    new FakeReadApiFetch()
      .install()
      .replyJson(500, { errorCode: "common.generic" });

    await expect(
      fetchFlashcardsManagePage({ pageIndex: 0, pageSize: 25 }),
    ).rejects.toMatchObject({ status: 500, errorCode: "common.generic" });
  });

  it("wraps struggling cards and surfaces failures as error results", async () => {
    const server = new FakeReadApiFetch()
      .install()
      .replyJson(200, [])
      .replyJson(500, { errorCode: "common.generic" });

    await expect(fetchStrugglingFlashcards()).resolves.toEqual({
      success: true,
      cards: [],
    });
    expect(server.requestedUrls[0]).toBe("/api/flashcards/struggling");
    await expect(fetchStrugglingFlashcards()).resolves.toEqual({
      errorCode: "common.generic",
    });
  });

  it("loads copy contents in URL-sized chunks and in the requested order", async () => {
    const ids = Array.from({ length: 150 }, (_, index) => `c${index}`);
    const toItem = (id: string) => ({
      id,
      front: id,
      back: "",
      subjectPath: "",
    });
    const server = new FakeReadApiFetch()
      .install()
      .replyJson(200, ids.slice(0, 100).reverse().map(toItem))
      .replyJson(200, ids.slice(101).map(toItem));

    const contents = await fetchFlashcardContents(ids);

    expect(server.requestedUrls).toHaveLength(2);
    expect(
      new URL(server.requestedUrls[0], "https://app.test").searchParams.getAll(
        "ids",
      ),
    ).toEqual(ids.slice(0, 100));
    expect(
      new URL(server.requestedUrls[1], "https://app.test").searchParams.getAll(
        "ids",
      ),
    ).toEqual(ids.slice(100));
    expect(contents.map((item) => item.id)).toEqual(
      ids.filter((id) => id !== "c100"),
    );
  });

  it("rejects the copy load when any chunk fails", async () => {
    new FakeReadApiFetch()
      .install()
      .replyJson(500, { errorCode: "common.generic" });

    await expect(fetchFlashcardContents(["c1"])).rejects.toThrow("status 500");
  });
});
