import { beforeEach, describe, expect, it, vi } from "vitest";

const getOptionalSessionMock = vi.fn();
const getMediaStorageProviderMock = vi.fn();
const getAssessmentAttachmentForUserMock = vi.fn();
const readFileMock = vi.fn();

vi.mock("@/lib/auth/auth", () => ({
  getOptionalSession: getOptionalSessionMock,
}));

vi.mock("@/lib/media-storage/provider", () => ({
  getMediaStorageProvider: getMediaStorageProviderMock,
}));

vi.mock("@/features/attachments/queries", () => ({
  getAssessmentAttachmentForUser: getAssessmentAttachmentForUserMock,
}));

function getRouteRequest(id = "attachment-1") {
  return new Request(`http://localhost/api/attachments/assessment?id=${id}`);
}

describe("GET /api/attachments/assessment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getOptionalSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    getAssessmentAttachmentForUserMock.mockResolvedValue({
      id: "attachment-1",
      fileName: "rubric.pdf",
      blobPathname: "notorium/assessments/user-1/rubric.pdf",
      mimeType: "application/pdf",
    });
    readFileMock.mockResolvedValue({
      stream: new ReadableStream(),
      contentType: "application/pdf",
      contentDisposition: "inline",
      cacheControl: "private",
      etag: "etag-1",
      size: 42,
    });
    getMediaStorageProviderMock.mockResolvedValue({
      readFile: readFileMock,
    });
  });

  it("returns 401 when the user is not authenticated", async () => {
    getOptionalSessionMock.mockResolvedValueOnce(null);

    const { GET } = await import("@/app/api/attachments/assessment/route");
    const response = await GET(getRouteRequest());

    expect(response.status).toBe(401);
    expect(getAssessmentAttachmentForUserMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the attachment is missing or inaccessible", async () => {
    getAssessmentAttachmentForUserMock.mockResolvedValueOnce(null);

    const { GET } = await import("@/app/api/attachments/assessment/route");
    const response = await GET(getRouteRequest());

    expect(response.status).toBe(404);
    expect(readFileMock).not.toHaveBeenCalled();
  });

  it("streams owned assessment files as downloads", async () => {
    const { GET } = await import("@/app/api/attachments/assessment/route");
    const response = await GET(getRouteRequest());

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="rubric.pdf"',
    );
    expect(readFileMock).toHaveBeenCalledWith({
      pathname: "notorium/assessments/user-1/rubric.pdf",
    });
  });
});
