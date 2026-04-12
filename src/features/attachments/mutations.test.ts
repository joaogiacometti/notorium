import { beforeEach, describe, expect, it, vi } from "vitest";
import { LIMITS } from "@/lib/config/limits";

const consumeUserDailyRateLimitMock = vi.fn();
const getMediaStorageProviderMock = vi.fn();
const uploadImageMock = vi.fn();
const readImageMock = vi.fn();

vi.mock("@/lib/rate-limit/user-rate-limit", () => ({
  consumeUserDailyRateLimit: consumeUserDailyRateLimitMock,
}));

vi.mock("@/lib/media-storage/provider", () => ({
  getMediaStorageProvider: getMediaStorageProviderMock,
}));

function createValidPayload(overrides: Record<string, unknown> = {}) {
  return {
    fileName: "pasted-image.png",
    mimeType: "image/png",
    dataBase64: Buffer.from("hello").toString("base64"),
    context: "notes" as const,
    ...overrides,
  };
}

describe("uploadEditorImageForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    consumeUserDailyRateLimitMock.mockResolvedValue({
      limited: false,
      remaining: LIMITS.attachmentUploadRateLimitPerDay - 1,
      resetAt: "2026-04-13T00:00:00.000Z",
    });

    uploadImageMock.mockImplementation(async (input) => ({
      url: "https://blob.vercel-storage.com/notorium/image.png",
      pathname: `notorium/${input.context}/${input.userId}/image.png`,
    }));

    getMediaStorageProviderMock.mockResolvedValue({
      uploadImage: uploadImageMock,
      readImage: readImageMock,
    });
  });

  it("returns mimeTypeNotAllowed when mime type is unsupported", async () => {
    const { uploadEditorImageForUser } = await import(
      "@/features/attachments/mutations"
    );

    const result = await uploadEditorImageForUser(
      "user-1",
      createValidPayload({ mimeType: "image/svg+xml" }),
    );

    expect(result).toEqual({
      success: false,
      errorCode: "attachments.mimeTypeNotAllowed",
      errorParams: undefined,
      errorMessage: undefined,
    });
    expect(consumeUserDailyRateLimitMock).not.toHaveBeenCalled();
    expect(getMediaStorageProviderMock).not.toHaveBeenCalled();
  });

  it("returns invalidData when base64 payload is invalid", async () => {
    const { uploadEditorImageForUser } = await import(
      "@/features/attachments/mutations"
    );

    const result = await uploadEditorImageForUser(
      "user-1",
      createValidPayload({ dataBase64: "%%%" }),
    );

    expect(result).toEqual({
      success: false,
      errorCode: "attachments.invalidData",
      errorParams: undefined,
      errorMessage: undefined,
    });
    expect(consumeUserDailyRateLimitMock).not.toHaveBeenCalled();
    expect(getMediaStorageProviderMock).not.toHaveBeenCalled();
  });

  it("returns size limit error when payload exceeds max bytes", async () => {
    const oversized = Buffer.alloc(LIMITS.attachmentMaxBytes + 1)
      .fill(1)
      .toString("base64");

    const { uploadEditorImageForUser } = await import(
      "@/features/attachments/mutations"
    );

    const result = await uploadEditorImageForUser(
      "user-1",
      createValidPayload({ dataBase64: oversized }),
    );

    expect(result).toEqual({
      success: false,
      errorCode: "limits.attachmentSizeLimit",
      errorParams: { max: LIMITS.attachmentMaxBytes },
      errorMessage: undefined,
    });
    expect(consumeUserDailyRateLimitMock).not.toHaveBeenCalled();
    expect(getMediaStorageProviderMock).not.toHaveBeenCalled();
  });

  it("returns rate limit error when upload quota is exceeded", async () => {
    consumeUserDailyRateLimitMock.mockResolvedValueOnce({
      limited: true,
      errorCode: "auth.rateLimited",
      remaining: 0,
      resetAt: "2026-04-13T00:00:00.000Z",
    });

    const { uploadEditorImageForUser } = await import(
      "@/features/attachments/mutations"
    );

    const result = await uploadEditorImageForUser(
      "user-1",
      createValidPayload(),
    );

    expect(result).toEqual({
      success: false,
      errorCode: "auth.rateLimited",
      errorParams: undefined,
      errorMessage: undefined,
    });
    expect(getMediaStorageProviderMock).toHaveBeenCalledTimes(1);
    expect(uploadImageMock).not.toHaveBeenCalled();
  });

  it("returns notConfigured when no storage provider is configured", async () => {
    getMediaStorageProviderMock.mockResolvedValueOnce(null);

    const { uploadEditorImageForUser } = await import(
      "@/features/attachments/mutations"
    );

    const result = await uploadEditorImageForUser(
      "user-1",
      createValidPayload(),
    );

    expect(result).toEqual({
      success: false,
      errorCode: "attachments.notConfigured",
      errorParams: undefined,
      errorMessage: undefined,
    });
    expect(consumeUserDailyRateLimitMock).not.toHaveBeenCalled();
  });

  it("uploads and returns authenticated read URL when provider is configured", async () => {
    const { uploadEditorImageForUser } = await import(
      "@/features/attachments/mutations"
    );

    const result = await uploadEditorImageForUser(
      "user-1",
      createValidPayload({ context: "flashcards" }),
    );

    expect(result).toEqual({
      success: true,
      url: "/api/attachments/blob?pathname=notorium%2Fflashcards%2Fuser-1%2Fimage.png",
    });
    expect(consumeUserDailyRateLimitMock).toHaveBeenCalledWith({
      prefix: LIMITS.attachmentUploadRateLimitPrefix,
      userId: "user-1",
      limit: LIMITS.attachmentUploadRateLimitPerDay,
      errorCode: "auth.rateLimited",
    });
    expect(uploadImageMock).toHaveBeenCalledWith({
      userId: "user-1",
      context: "flashcards",
      fileName: "pasted-image.png",
      mimeType: "image/png",
      bytes: expect.any(Uint8Array),
    });
  });
});
