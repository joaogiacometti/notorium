import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getOptionalSessionMock,
  getBookByIdForUserMock,
  getMediaStorageProviderMock,
} = vi.hoisted(() => ({
  getOptionalSessionMock: vi.fn(),
  getBookByIdForUserMock: vi.fn(),
  getMediaStorageProviderMock: vi.fn(),
}));

vi.mock("@/lib/auth/auth", () => ({
  getOptionalSession: getOptionalSessionMock,
}));

vi.mock("@/features/library/queries", () => ({
  getBookByIdForUser: getBookByIdForUserMock,
}));

vi.mock("@/lib/media-storage/provider", () => ({
  getMediaStorageProvider: getMediaStorageProviderMock,
}));

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeSession(userId = "user-1") {
  return { user: { id: userId } };
}

function makeBook(overrides: Record<string, unknown> = {}) {
  return {
    id: "book-1",
    fileName: "a-book.pdf",
    blobPathname: "notorium/library/user-1/uuid-a-book.pdf",
    ...overrides,
  };
}

function makeFileResult(overrides: Record<string, unknown> = {}) {
  return {
    stream: new ReadableStream(),
    etag: "etag-value",
    size: 512,
    contentType: "application/pdf",
    contentDisposition: "",
    cacheControl: "private",
    ...overrides,
  };
}

function makeProvider(
  fileResult: ReturnType<typeof makeFileResult> | null = makeFileResult(),
) {
  return { readFile: vi.fn().mockResolvedValue(fileResult) };
}

describe("GET /api/library/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("returns 401 when unauthenticated", async () => {
    getOptionalSessionMock.mockResolvedValue(null);
    const { GET } = await import("./route");

    const response = await GET(new Request("http://x"), makeContext("book-1"));

    expect(response.status).toBe(401);
  });

  it("returns 400 for a whitespace-only book id", async () => {
    getOptionalSessionMock.mockResolvedValue(makeSession());
    const { GET } = await import("./route");

    const response = await GET(new Request("http://x"), makeContext("   "));

    expect(response.status).toBe(400);
  });

  it("returns 404 when the book does not belong to the user", async () => {
    getOptionalSessionMock.mockResolvedValue(makeSession());
    getBookByIdForUserMock.mockResolvedValue(null);
    const { GET } = await import("./route");

    const response = await GET(new Request("http://x"), makeContext("book-1"));

    expect(response.status).toBe(404);
  });

  it("returns 503 when media storage is not configured", async () => {
    getOptionalSessionMock.mockResolvedValue(makeSession());
    getBookByIdForUserMock.mockResolvedValue(makeBook());
    getMediaStorageProviderMock.mockResolvedValue(null);
    const { GET } = await import("./route");

    const response = await GET(new Request("http://x"), makeContext("book-1"));

    expect(response.status).toBe(503);
  });

  it("returns 404 when the file is missing from storage", async () => {
    getOptionalSessionMock.mockResolvedValue(makeSession());
    getBookByIdForUserMock.mockResolvedValue(makeBook());
    getMediaStorageProviderMock.mockResolvedValue(makeProvider(null));
    const { GET } = await import("./route");

    const response = await GET(new Request("http://x"), makeContext("book-1"));

    expect(response.status).toBe(404);
  });

  it("returns 502 when the storage provider throws", async () => {
    getOptionalSessionMock.mockResolvedValue(makeSession());
    getBookByIdForUserMock.mockResolvedValue(makeBook());
    const provider = {
      readFile: vi.fn().mockRejectedValue(new Error("blob error")),
    };
    getMediaStorageProviderMock.mockResolvedValue(provider);
    const { GET } = await import("./route");

    const response = await GET(new Request("http://x"), makeContext("book-1"));

    expect(response.status).toBe(502);
  });

  it("returns 200 with correct PDF headers on success", async () => {
    getOptionalSessionMock.mockResolvedValue(makeSession());
    getBookByIdForUserMock.mockResolvedValue(makeBook());
    getMediaStorageProviderMock.mockResolvedValue(
      makeProvider(makeFileResult({ etag: "etag-abc", size: 2048 })),
    );
    const { GET } = await import("./route");

    const response = await GET(new Request("http://x"), makeContext("book-1"));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("etag")).toBe("etag-abc");
    expect(response.headers.get("content-length")).toBe("2048");
    expect(response.headers.get("cache-control")).toBe(
      "private, max-age=0, must-revalidate",
    );
  });

  it("encodes the filename with RFC 5987 in Content-Disposition", async () => {
    getOptionalSessionMock.mockResolvedValue(makeSession());
    getBookByIdForUserMock.mockResolvedValue(
      makeBook({ fileName: "my book.pdf" }),
    );
    getMediaStorageProviderMock.mockResolvedValue(makeProvider());
    const { GET } = await import("./route");

    const response = await GET(new Request("http://x"), makeContext("book-1"));
    const disposition = response.headers.get("content-disposition");

    expect(disposition).toBe("inline; filename*=UTF-8''my%20book.pdf");
  });

  it("percent-encodes non-ASCII characters in Content-Disposition", async () => {
    getOptionalSessionMock.mockResolvedValue(makeSession());
    getBookByIdForUserMock.mockResolvedValue(
      makeBook({ fileName: "café résumé.pdf" }),
    );
    getMediaStorageProviderMock.mockResolvedValue(makeProvider());
    const { GET } = await import("./route");

    const response = await GET(new Request("http://x"), makeContext("book-1"));
    const disposition = response.headers.get("content-disposition");

    expect(disposition).toMatch(/^inline; filename\*=UTF-8''/);
    expect(disposition).not.toMatch(/[\x80-\xFF]/);
  });

  it("handles filenames with curly quotes without throwing", async () => {
    getOptionalSessionMock.mockResolvedValue(makeSession());
    getBookByIdForUserMock.mockResolvedValue(
      makeBook({ fileName: "a’s guide.pdf" }),
    );
    getMediaStorageProviderMock.mockResolvedValue(makeProvider());
    const { GET } = await import("./route");

    const response = await GET(new Request("http://x"), makeContext("book-1"));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toBe(
      "inline; filename*=UTF-8''a%E2%80%99s%20guide.pdf",
    );
  });

  it("looks up the book under the authenticated user's id", async () => {
    getOptionalSessionMock.mockResolvedValue(makeSession("user-99"));
    getBookByIdForUserMock.mockResolvedValue(null);
    const { GET } = await import("./route");

    await GET(new Request("http://x"), makeContext("book-1"));

    expect(getBookByIdForUserMock).toHaveBeenCalledWith("user-99", "book-1");
  });
});
