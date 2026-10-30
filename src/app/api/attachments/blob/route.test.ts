import { beforeEach, describe, expect, it, vi } from "vitest";

const getOptionalSessionMock = vi.fn();
const getMediaStorageProviderMock = vi.fn();
const readBlobMock = vi.fn();

vi.mock("@/lib/auth/auth", () => ({
  getOptionalSession: getOptionalSessionMock,
}));

vi.mock("@/lib/media-storage/provider", () => ({
  getMediaStorageProvider: getMediaStorageProviderMock,
}));

function getRouteRequest(pathname: string, headers?: HeadersInit) {
  return new Request(
    `http://localhost/api/attachments/blob?pathname=${encodeURIComponent(pathname)}`,
    { headers },
  );
}

function createStream(value: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(value);

  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

describe("GET /api/attachments/blob", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    getOptionalSessionMock.mockResolvedValue({
      user: {
        id: "user-1",
      },
    });

    readBlobMock.mockResolvedValue({
      stream: createStream("ok"),
      contentType: "image/png",
      contentDisposition: "inline",
      cacheControl: "private, max-age=0",
      etag: "etag-1",
      size: 2,
      contentRange: null,
    });

    getMediaStorageProviderMock.mockResolvedValue({
      uploadImage: vi.fn(),
      readBlob: readBlobMock,
    });
  });

  it("returns 401 when there is no authenticated session", async () => {
    getOptionalSessionMock.mockResolvedValueOnce(null);

    const { GET } = await import("@/app/api/attachments/blob/route");
    const response = await GET(
      getRouteRequest("notorium/notes/user-1/file.png"),
    );

    expect(response.status).toBe(401);
    expect(getMediaStorageProviderMock).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid pathname", async () => {
    const { GET } = await import("@/app/api/attachments/blob/route");
    const response = await GET(getRouteRequest("../../etc/passwd"));

    expect(response.status).toBe(400);
    expect(getMediaStorageProviderMock).not.toHaveBeenCalled();
  });

  it("returns 403 when pathname owner does not match authenticated user", async () => {
    const { GET } = await import("@/app/api/attachments/blob/route");
    const response = await GET(
      getRouteRequest("notorium/notes/user-2/file.png"),
    );

    expect(response.status).toBe(403);
    expect(getMediaStorageProviderMock).not.toHaveBeenCalled();
  });

  it("returns 503 when media storage provider is not configured", async () => {
    getMediaStorageProviderMock.mockResolvedValueOnce(null);

    const { GET } = await import("@/app/api/attachments/blob/route");
    const response = await GET(
      getRouteRequest("notorium/notes/user-1/file.png"),
    );

    expect(response.status).toBe(503);
  });

  it("returns 404 when blob cannot be found", async () => {
    readBlobMock.mockResolvedValueOnce(null);

    const { GET } = await import("@/app/api/attachments/blob/route");
    const response = await GET(
      getRouteRequest("notorium/flashcards/user-1/file.png"),
    );

    expect(response.status).toBe(404);
    expect(readBlobMock).toHaveBeenCalledWith({
      pathname: "notorium/flashcards/user-1/file.png",
    });
  });

  it("streams blob data when user owns requested pathname", async () => {
    const { GET } = await import("@/app/api/attachments/blob/route");
    const response = await GET(
      getRouteRequest("notorium/notes/user-1/file.png"),
    );

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe("ok");
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("content-disposition")).toBe("inline");
    expect(response.headers.get("cache-control")).toBe("private, max-age=0");
    expect(response.headers.get("etag")).toBe("etag-1");
    expect(response.headers.get("content-length")).toBe("2");
  });

  it("answers a valid range request with partial content", async () => {
    readBlobMock.mockResolvedValueOnce({
      stream: createStream("pdf"),
      contentType: "application/pdf",
      contentDisposition: "inline",
      cacheControl: "private, max-age=0",
      etag: "etag-2",
      size: 3,
      contentRange: "bytes 0-2/1000",
    });

    const { GET } = await import("@/app/api/attachments/blob/route");
    const response = await GET(
      getRouteRequest("notorium/pdfs/user-1/book.pdf", { range: "bytes=0-2" }),
    );

    expect(readBlobMock).toHaveBeenCalledWith({
      pathname: "notorium/pdfs/user-1/book.pdf",
      range: "bytes=0-2",
    });
    expect(response.status).toBe(206);
    expect(response.headers.get("content-range")).toBe("bytes 0-2/1000");
    expect(response.headers.get("accept-ranges")).toBe("bytes");
  });

  it("ignores a malformed range header and reads the whole blob", async () => {
    const { GET } = await import("@/app/api/attachments/blob/route");
    const response = await GET(
      getRouteRequest("notorium/notes/user-1/file.png", { range: "bytes=9-1" }),
    );

    expect(readBlobMock).toHaveBeenCalledWith({
      pathname: "notorium/notes/user-1/file.png",
      range: undefined,
    });
    expect(response.status).toBe(200);
  });
});
