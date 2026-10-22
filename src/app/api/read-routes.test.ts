import { beforeEach, describe, expect, it, vi } from "vitest";
import { decodeReadPayload } from "@/lib/read-api/read-payload";

const queries = vi.hoisted(() => ({
  getAccountSettingsForUser: vi.fn(),
  getFlashcardsManagePageForUser: vi.fn(),
  getFlashcardWithSourceByIdForUser: vi.fn(),
  getFlashcardContentsForUser: vi.fn(),
  getStrugglingFlashcardsForUser: vi.fn(),
  getFlashcardReviewStateForUser: vi.fn(),
  getAllFlashcardsForExam: vi.fn(),
  ensureFsrsSettings: vi.fn(),
  getMindmapByIdForUser: vi.fn(),
  getNoteByIdForUser: vi.fn(),
  getSearchDataForUser: vi.fn(),
  getRecentSearchDataForUser: vi.fn(),
  getAllSubjectsWithPathsForUser: vi.fn(),
  getSubjectDocumentsForUser: vi.fn(),
}));

const sessionUser = {
  id: "user-1",
  name: "Ada",
  email: "ada@example.com",
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
};

vi.mock("@/lib/auth/auth", () => ({
  getOptionalSession: async () => ({ user: sessionUser }),
}));
vi.mock("@/features/account/queries", () => queries);
vi.mock("@/features/flashcards/queries", () => queries);
vi.mock("@/features/flashcards/refine/queries", () => queries);
vi.mock("@/features/flashcard-review/queries", () => queries);
vi.mock("@/features/flashcards/fsrs/settings-mutations", () => queries);
vi.mock("@/features/mindmaps/queries", () => queries);
vi.mock("@/features/notes/queries", () => queries);
vi.mock("@/features/search/queries", () => queries);
vi.mock("@/features/subjects/queries", () => queries);
vi.mock("@/features/documents/queries", () => queries);

type RouteGet = (
  request: Request,
  context: { params: Promise<Record<string, string>> },
) => Promise<Response>;

function get(url: string): Request {
  return new Request(`https://app.test${url}`);
}

function params(values: Record<string, string>) {
  return { params: Promise.resolve(values) };
}

async function callRoute(
  modulePath: Promise<{ GET: unknown }>,
  url: string,
  routeParams: Record<string, string> = {},
): Promise<{ status: number; body: unknown }> {
  const { GET } = await modulePath;
  const response = await (GET as RouteGet)(get(url), params(routeParams));
  return {
    status: response.status,
    body: decodeReadPayload(await response.text()),
  };
}

describe("read route handlers", () => {
  beforeEach(() => {
    for (const mock of Object.values(queries)) {
      mock.mockReset().mockResolvedValue([]);
    }
  });

  it("account settings reads for the session user", async () => {
    queries.getAccountSettingsForUser.mockResolvedValue({ name: "Ada" });

    const result = await callRoute(
      import("@/app/api/account/settings/route"),
      "/api/account/settings",
    );

    expect(result).toEqual({ status: 200, body: { name: "Ada" } });
    expect(queries.getAccountSettingsForUser).toHaveBeenCalledWith(sessionUser);
  });

  it("manage page collects repeated subjectIds", async () => {
    await callRoute(
      import("@/app/api/flashcards/manage-page/route"),
      "/api/flashcards/manage-page?pageIndex=0&pageSize=25&subjectIds=a&subjectIds=b",
    );

    expect(queries.getFlashcardsManagePageForUser).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ subjectIds: ["a", "b"] }),
    );
  });

  it("flashcard by id answers 404 when missing", async () => {
    queries.getFlashcardWithSourceByIdForUser.mockResolvedValue(null);

    const result = await callRoute(
      import("@/app/api/flashcards/[flashcardId]/route"),
      "/api/flashcards/card-1",
      { flashcardId: "card-1" },
    );

    expect(result.status).toBe(404);
    expect(result.body).toMatchObject({ errorCode: "flashcards.notFound" });
    expect(queries.getFlashcardWithSourceByIdForUser).toHaveBeenCalledWith(
      "user-1",
      "card-1",
    );
  });

  it("flashcard contents collects repeated ids and caps them per request", async () => {
    const route = import("@/app/api/flashcards/contents/route");
    const tooMany = Array.from({ length: 101 }, (_, index) => `ids=c${index}`);
    const bad = await callRoute(
      route,
      `/api/flashcards/contents?${tooMany.join("&")}`,
    );
    const empty = await callRoute(route, "/api/flashcards/contents");
    await callRoute(route, "/api/flashcards/contents?ids=c1&ids=c2");

    expect(bad.status).toBe(400);
    expect(empty.status).toBe(400);
    expect(queries.getFlashcardContentsForUser).toHaveBeenCalledTimes(1);
    expect(queries.getFlashcardContentsForUser).toHaveBeenCalledWith("user-1", [
      "c1",
      "c2",
    ]);
  });

  it("struggling cards reads for the session user", async () => {
    await callRoute(
      import("@/app/api/flashcards/struggling/route"),
      "/api/flashcards/struggling",
    );

    expect(queries.getStrugglingFlashcardsForUser).toHaveBeenCalledWith(
      "user-1",
    );
  });

  it("review state rejects an out-of-range limit before querying", async () => {
    const route = import("@/app/api/flashcards/review-state/route");
    const bad = await callRoute(
      route,
      "/api/flashcards/review-state?limit=1000000",
    );
    await callRoute(
      route,
      "/api/flashcards/review-state?subjectId=s1&limit=20",
    );

    expect(bad.status).toBe(400);
    expect(queries.getFlashcardReviewStateForUser).toHaveBeenCalledTimes(1);
    expect(queries.getFlashcardReviewStateForUser).toHaveBeenCalledWith(
      "user-1",
      { subjectId: "s1", limit: 20 },
    );
  });

  it("exam cards reads without writing scheduler settings", async () => {
    await callRoute(
      import("@/app/api/flashcards/exam-cards/route"),
      "/api/flashcards/exam-cards?subjectId=s1",
    );

    expect(queries.ensureFsrsSettings).not.toHaveBeenCalled();
    expect(queries.getAllFlashcardsForExam).toHaveBeenCalledWith("user-1", {
      subjectId: "s1",
    });
  });

  it("mindmap and note by id answer 404 when missing", async () => {
    queries.getMindmapByIdForUser.mockResolvedValue(null);
    queries.getNoteByIdForUser.mockResolvedValue(null);

    const mindmap = await callRoute(
      import("@/app/api/mindmaps/[mindmapId]/route"),
      "/api/mindmaps/m1",
      { mindmapId: "m1" },
    );
    const note = await callRoute(
      import("@/app/api/notes/[noteId]/route"),
      "/api/notes/n1",
      { noteId: "n1" },
    );

    expect(mindmap.body).toMatchObject({ errorCode: "mindmaps.notFound" });
    expect(note.body).toMatchObject({ errorCode: "notes.notFound" });
    expect(queries.getNoteByIdForUser).toHaveBeenCalledWith("user-1", "n1");
  });

  it("note by id returns the owned note with dates revived", async () => {
    const updatedAt = new Date("2026-10-15T00:00:00.000Z");
    queries.getNoteByIdForUser.mockResolvedValue({ id: "n1", updatedAt });

    const result = await callRoute(
      import("@/app/api/notes/[noteId]/route"),
      "/api/notes/n1",
      { noteId: "n1" },
    );

    expect(result).toEqual({ status: 200, body: { id: "n1", updatedAt } });
  });

  it("search skips the query below the minimum length", async () => {
    const route = import("@/app/api/search/route");
    const short = await callRoute(route, "/api/search?q=a");
    await callRoute(route, "/api/search?q=%20mitosis%20");

    expect(short.body).toEqual({
      notes: [],
      flashcards: [],
      mindmaps: [],
    });
    expect(queries.getSearchDataForUser).toHaveBeenCalledTimes(1);
    expect(queries.getSearchDataForUser).toHaveBeenCalledWith(
      "user-1",
      "mitosis",
    );
  });

  it("recent search and subject options read for the user", async () => {
    await callRoute(
      import("@/app/api/search/recent/route"),
      "/api/search/recent",
    );
    await callRoute(
      import("@/app/api/subjects/options/route"),
      "/api/subjects/options",
    );

    expect(queries.getRecentSearchDataForUser).toHaveBeenCalledWith("user-1");
    expect(queries.getAllSubjectsWithPathsForUser).toHaveBeenCalledWith(
      "user-1",
    );
  });

  it("subject documents reads one owned subject", async () => {
    queries.getSubjectDocumentsForUser.mockResolvedValue([{ id: "note-1" }]);

    const result = await callRoute(
      import("@/app/api/subjects/[subjectId]/documents/route"),
      "/api/subjects/s1/documents",
      { subjectId: "s1" },
    );

    expect(result).toEqual({ status: 200, body: [{ id: "note-1" }] });
    expect(queries.getSubjectDocumentsForUser).toHaveBeenCalledWith(
      "user-1",
      "s1",
    );
  });
});
