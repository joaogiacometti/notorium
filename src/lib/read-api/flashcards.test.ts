import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchFlashcardContents,
  fetchFlashcardForManage,
  fetchFlashcardIds,
  fetchRefineFlashcardGroups,
} from "@/lib/read-api/flashcards";
import { FakeReadApiFetch } from "@/test/fake-read-api-fetch";

describe("flashcard read-api fetchers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("wraps ids in the success result callers already handle", async () => {
    const server = new FakeReadApiFetch()
      .install()
      .replyJson(200, ["c1", "c2"])
      .replyJson(200, []);

    await expect(fetchFlashcardIds("s1")).resolves.toEqual({
      success: true,
      flashcardIds: ["c1", "c2"],
    });
    await fetchFlashcardIds();
    expect(server.requestedUrls).toEqual([
      "/api/flashcards/ids?subjectId=s1",
      "/api/flashcards/ids",
    ]);
  });

  it("wraps a found flashcard and passes a not-found error through", async () => {
    const server = new FakeReadApiFetch()
      .install()
      .replyJson(200, { id: "c/1" })
      .replyJson(404, { errorCode: "flashcards.notFound" });

    await expect(fetchFlashcardForManage("c/1")).resolves.toEqual({
      flashcard: { id: "c/1" },
    });
    await expect(fetchFlashcardForManage("c/1")).resolves.toEqual({
      errorCode: "flashcards.notFound",
    });
    expect(server.requestedUrls[0]).toBe("/api/flashcards/c%2F1");
  });

  it("wraps refine groups and surfaces failures as error results", async () => {
    const groups = { mastered: [], struggling: [] };
    new FakeReadApiFetch()
      .install()
      .replyJson(200, groups)
      .replyJson(500, { errorCode: "common.generic" });

    await expect(fetchRefineFlashcardGroups()).resolves.toEqual({
      success: true,
      groups,
    });
    await expect(fetchRefineFlashcardGroups()).resolves.toEqual({
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
