import { beforeEach, describe, expect, it, vi } from "vitest";
import { LIMITS } from "@/lib/config/limits";

const consumeUserDailyRateLimitMock = vi.fn();
const getMediaStorageProviderMock = vi.fn();
const uploadImageMock = vi.fn();
const uploadFileMock = vi.fn();
const deleteFilesMock = vi.fn();
const readImageMock = vi.fn();
const insertReturningMock = vi.fn();
const insertValuesMock = vi.fn(() => ({ returning: insertReturningMock }));
const insertMock = vi.fn(() => ({ values: insertValuesMock }));
const deleteWhereMock = vi.fn();
const deleteMock = vi.fn(() => ({ where: deleteWhereMock }));
const getAssessmentRecordForUserMock = vi.fn();
const countAssessmentAttachmentsForUserMock = vi.fn();
const getAssessmentAttachmentForUserMock = vi.fn();
const andMock = vi.fn((...conditions) => conditions);
const eqMock = vi.fn((column, value) => ({ column, value }));

vi.mock("@/db/index", () => ({
  getDb: () => ({
    insert: insertMock,
    delete: deleteMock,
  }),
}));

vi.mock("drizzle-orm", () => ({
  and: andMock,
  eq: eqMock,
}));

vi.mock("@/db/schema", () => ({
  assessmentAttachment: {
    id: "assessment_attachment_id_column",
    userId: "assessment_attachment_user_id_column",
  },
}));

vi.mock("@/features/assessments/queries", () => ({
  getAssessmentRecordForUser: getAssessmentRecordForUserMock,
}));

vi.mock("@/features/attachments/queries", () => ({
  countAssessmentAttachmentsForUser: countAssessmentAttachmentsForUserMock,
  getAssessmentAttachmentForUser: getAssessmentAttachmentForUserMock,
}));

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
      uploadFile: uploadFileMock,
      uploadImage: uploadImageMock,
      deleteFiles: deleteFilesMock,
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

function createValidAssessmentAttachmentPayload(
  overrides: Record<string, unknown> = {},
) {
  return {
    assessmentId: "assessment-1",
    fileName: "rubric.pdf",
    mimeType: "application/pdf",
    dataBase64: Buffer.from("rubric").toString("base64"),
    ...overrides,
  };
}

describe("uploadAssessmentAttachmentForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAssessmentRecordForUserMock.mockResolvedValue({
      id: "assessment-1",
      subjectId: "subject-1",
    });
    countAssessmentAttachmentsForUserMock.mockResolvedValue(0);
    consumeUserDailyRateLimitMock.mockResolvedValue({
      limited: false,
      remaining: LIMITS.attachmentUploadRateLimitPerDay - 1,
      resetAt: "2026-04-13T00:00:00.000Z",
    });
    uploadFileMock.mockResolvedValue({
      url: "https://blob.vercel-storage.com/notorium/rubric.pdf",
      pathname: "notorium/assessments/user-1/rubric.pdf",
    });
    insertReturningMock.mockResolvedValue([
      {
        id: "attachment-1",
        assessmentId: "assessment-1",
        userId: "user-1",
        fileName: "rubric.pdf",
        blobPathname: "notorium/assessments/user-1/rubric.pdf",
        mimeType: "application/pdf",
        sizeBytes: 6,
      },
    ]);
    deleteFilesMock.mockResolvedValue(undefined);
    getMediaStorageProviderMock.mockResolvedValue({
      uploadFile: uploadFileMock,
      uploadImage: uploadImageMock,
      deleteFiles: deleteFilesMock,
      readImage: readImageMock,
    });
  });

  it("rejects unsupported assessment file types", async () => {
    const { uploadAssessmentAttachmentForUser } = await import(
      "@/features/attachments/mutations"
    );

    const result = await uploadAssessmentAttachmentForUser(
      "user-1",
      createValidAssessmentAttachmentPayload({
        mimeType: "application/x-msdownload",
      }),
    );

    expect(result).toEqual({
      success: false,
      errorCode: "attachments.mimeTypeNotAllowed",
      errorParams: undefined,
      errorMessage: undefined,
    });
    expect(uploadFileMock).not.toHaveBeenCalled();
  });

  it("uploads a supported assessment file and records metadata", async () => {
    const { uploadAssessmentAttachmentForUser } = await import(
      "@/features/attachments/mutations"
    );

    const result = await uploadAssessmentAttachmentForUser(
      "user-1",
      createValidAssessmentAttachmentPayload(),
    );

    expect(result).toEqual({
      success: true,
      attachment: expect.objectContaining({
        id: "attachment-1",
        blobPathname: "notorium/assessments/user-1/rubric.pdf",
      }),
    });
    expect(uploadFileMock).toHaveBeenCalledWith({
      userId: "user-1",
      context: "assessments",
      fileName: "rubric.pdf",
      mimeType: "application/pdf",
      bytes: expect.any(Uint8Array),
    });
    expect(insertValuesMock).toHaveBeenCalledWith({
      assessmentId: "assessment-1",
      userId: "user-1",
      fileName: "rubric.pdf",
      blobPathname: "notorium/assessments/user-1/rubric.pdf",
      mimeType: "application/pdf",
      sizeBytes: 6,
    });
  });
});

describe("deleteAssessmentAttachmentForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAssessmentAttachmentForUserMock.mockResolvedValue({
      id: "attachment-1",
      assessmentId: "assessment-1",
      userId: "user-1",
      fileName: "rubric.pdf",
      blobPathname: "notorium/assessments/user-1/rubric.pdf",
      mimeType: "application/pdf",
      sizeBytes: 6,
    });
    deleteFilesMock.mockResolvedValue(undefined);
    getMediaStorageProviderMock.mockResolvedValue({
      uploadFile: uploadFileMock,
      uploadImage: uploadImageMock,
      deleteFiles: deleteFilesMock,
      readImage: readImageMock,
    });
  });

  it("deletes storage before removing attachment metadata", async () => {
    const { deleteAssessmentAttachmentForUser } = await import(
      "@/features/attachments/mutations"
    );

    const result = await deleteAssessmentAttachmentForUser("user-1", {
      id: "attachment-1",
    });

    expect(result).toEqual({ success: true });
    expect(deleteFilesMock).toHaveBeenCalledWith({
      pathnames: ["notorium/assessments/user-1/rubric.pdf"],
    });
    expect(deleteMock).toHaveBeenCalledWith({
      id: "assessment_attachment_id_column",
      userId: "assessment_attachment_user_id_column",
    });
    expect(deleteWhereMock).toHaveBeenCalled();
  });

  it("returns deleteFailed without deleting metadata when storage deletion fails", async () => {
    deleteFilesMock.mockRejectedValueOnce(new Error("blob delete failed"));
    const { deleteAssessmentAttachmentForUser } = await import(
      "@/features/attachments/mutations"
    );

    const result = await deleteAssessmentAttachmentForUser("user-1", {
      id: "attachment-1",
    });

    expect(result).toEqual({
      success: false,
      errorCode: "attachments.deleteFailed",
      errorParams: undefined,
      errorMessage: undefined,
    });
    expect(deleteFilesMock).toHaveBeenCalledWith({
      pathnames: ["notorium/assessments/user-1/rubric.pdf"],
    });
    expect(deleteMock).not.toHaveBeenCalled();
  });
});
