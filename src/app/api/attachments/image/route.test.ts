import { beforeEach, describe, expect, it, vi } from "vitest";

const getOptionalSessionMock = vi.fn();
const uploadAttachmentImageForUserMock = vi.fn();

vi.mock("@/lib/auth/auth", () => ({
  getOptionalSession: getOptionalSessionMock,
}));

vi.mock("@/features/attachments/mutations", () => ({
  uploadAttachmentImageForUser: uploadAttachmentImageForUserMock,
}));

function buildRequest(form: FormData): Request {
  return new Request("http://localhost/api/attachments/image", {
    method: "POST",
    body: form,
  });
}

function buildForm(
  overrides: { file?: File; context?: string } = {},
): FormData {
  const form = new FormData();
  if (overrides.file !== undefined) {
    form.append("file", overrides.file);
  }
  if (overrides.context !== undefined) {
    form.append("context", overrides.context);
  }
  return form;
}

describe("POST /api/attachments/image", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getOptionalSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    uploadAttachmentImageForUserMock.mockResolvedValue({
      success: true,
      url: "/api/attachments/blob?pathname=p",
      pathname: "p",
    });
  });

  it("rejects unauthenticated requests", async () => {
    getOptionalSessionMock.mockResolvedValueOnce(null);
    const { POST } = await import("./route");

    const response = await POST(
      buildRequest(
        buildForm({
          file: new File(["x"], "a.png", { type: "image/png" }),
          context: "flashcards",
        }),
      ),
    );

    expect(response.status).toBe(401);
    expect(uploadAttachmentImageForUserMock).not.toHaveBeenCalled();
  });

  it("rejects an unknown upload context", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      buildRequest(
        buildForm({
          file: new File(["x"], "a.png", { type: "image/png" }),
          context: "library",
        }),
      ),
    );

    expect(response.status).toBe(400);
    expect(uploadAttachmentImageForUserMock).not.toHaveBeenCalled();
  });

  it("rejects a request with no file", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      buildRequest(buildForm({ context: "flashcards" })),
    );

    expect(response.status).toBe(400);
    expect(uploadAttachmentImageForUserMock).not.toHaveBeenCalled();
  });

  it("delegates a valid upload and returns its result", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      buildRequest(
        buildForm({
          file: new File(["hello"], "a.png", { type: "image/png" }),
          context: "flashcards",
        }),
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      url: "/api/attachments/blob?pathname=p",
      pathname: "p",
    });
    expect(uploadAttachmentImageForUserMock).toHaveBeenCalledWith("user-1", {
      fileName: "a.png",
      mimeType: "image/png",
      bytes: expect.any(Uint8Array),
      context: "flashcards",
    });
  });

  it("returns a 400 status when the upload core reports an error", async () => {
    uploadAttachmentImageForUserMock.mockResolvedValueOnce({
      success: false,
      errorCode: "attachments.mimeTypeNotAllowed",
    });
    const { POST } = await import("./route");

    const response = await POST(
      buildRequest(
        buildForm({
          file: new File(["x"], "a.svg", { type: "image/svg+xml" }),
          context: "notes",
        }),
      ),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      success: false,
      errorCode: "attachments.mimeTypeNotAllowed",
    });
  });
});
