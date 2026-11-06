import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  CreateClientUploadTokenInput,
  StoredBlobHead,
} from "@/lib/media-storage/provider";

const {
  insertedRows,
  getFolderRecordForUserMock,
  countPdfsByFolderForUserMock,
  getMediaStorageProviderMock,
  consumeUserDailyRateLimitMock,
} = vi.hoisted(() => ({
  insertedRows: [] as unknown[],
  getFolderRecordForUserMock: vi.fn(),
  countPdfsByFolderForUserMock: vi.fn(),
  getMediaStorageProviderMock: vi.fn(),
  consumeUserDailyRateLimitMock: vi.fn(),
}));

vi.mock("@/db/index", () => ({
  getDb: () => ({
    insert: () => ({
      values: async (row: unknown) => {
        insertedRows.push(row);
      },
    }),
  }),
}));
vi.mock("@/db/schema", () => ({ pdfDocument: "pdf_document_table" }));
vi.mock("@/features/folders/queries", () => ({
  getFolderRecordForUser: getFolderRecordForUserMock,
}));
vi.mock("@/features/pdfs/queries", () => ({
  countPdfsByFolderForUser: countPdfsByFolderForUserMock,
}));
vi.mock("@/lib/media-storage/provider", () => ({
  getMediaStorageProvider: getMediaStorageProviderMock,
}));
vi.mock("@/lib/rate-limit/user-rate-limit", () => ({
  consumeUserDailyRateLimit: consumeUserDailyRateLimitMock,
}));

import {
  createPdfForUser,
  preparePdfUploadForUser,
} from "@/features/pdfs/upload-mutations";
import { LIMITS } from "@/lib/config/limits";

class PdfStorageFake {
  readonly tokens: CreateClientUploadTokenInput[] = [];
  readonly blobs = new Map<string, StoredBlobHead>();

  async createClientUploadToken(input: CreateClientUploadTokenInput) {
    this.tokens.push(input);
    return "client-token";
  }

  async headBlob(pathname: string): Promise<StoredBlobHead | null> {
    return this.blobs.get(pathname) ?? null;
  }
}

const OWN_PDF = "notorium/pdfs/user-1/id-book.pdf";

function createInput(blobPathname = OWN_PDF) {
  return {
    folderId: "folder-1",
    title: "Book",
    fileName: "book.pdf",
    blobPathname,
  };
}

let storage: PdfStorageFake;

beforeEach(() => {
  vi.clearAllMocks();
  insertedRows.length = 0;
  storage = new PdfStorageFake();
  getMediaStorageProviderMock.mockResolvedValue(storage);
  getFolderRecordForUserMock.mockResolvedValue({ id: "folder-1" });
  countPdfsByFolderForUserMock.mockResolvedValue(0);
  consumeUserDailyRateLimitMock.mockResolvedValue({ limited: false });
});

describe("preparePdfUploadForUser", () => {
  it("issues a PDF-only token for a pathname under the user's prefix", async () => {
    const result = await preparePdfUploadForUser("user-1", {
      folderId: "folder-1",
      fileName: "book.pdf",
      sizeBytes: 1024,
    });

    expect(result).toMatchObject({
      success: true,
      clientToken: "client-token",
    });
    expect(storage.tokens[0]).toMatchObject({
      maximumSizeInBytes: LIMITS.pdfMaxBytes,
      allowedContentTypes: ["application/pdf"],
    });
    expect(storage.tokens[0]?.pathname).toMatch(
      /^notorium\/pdfs\/user-1\/[0-9a-f-]{36}-book\.pdf$/,
    );
  });

  it("rejects a file over the size limit before charging the quota", async () => {
    const result = await preparePdfUploadForUser("user-1", {
      folderId: "folder-1",
      fileName: "big.pdf",
      sizeBytes: LIMITS.pdfMaxBytes + 1,
    });

    expect(result).toMatchObject({ errorCode: "limits.pdfSizeLimit" });
    expect(consumeUserDailyRateLimitMock).not.toHaveBeenCalled();
  });

  it("rejects a folder that already holds the maximum PDFs", async () => {
    countPdfsByFolderForUserMock.mockResolvedValue(LIMITS.maxPdfsPerFolder);

    const result = await preparePdfUploadForUser("user-1", {
      folderId: "folder-1",
      fileName: "book.pdf",
      sizeBytes: 1024,
    });

    expect(result).toMatchObject({
      errorCode: "limits.pdfLimit",
      errorParams: { max: LIMITS.maxPdfsPerFolder },
    });
    expect(storage.tokens).toHaveLength(0);
  });

  it("stops at the daily upload quota", async () => {
    consumeUserDailyRateLimitMock.mockResolvedValue({
      limited: true,
      errorCode: "limits.pdfUploadsPerDay",
    });

    const result = await preparePdfUploadForUser("user-1", {
      folderId: "folder-1",
      fileName: "book.pdf",
      sizeBytes: 1024,
    });

    expect(result).toMatchObject({ errorCode: "limits.pdfUploadsPerDay" });
    expect(storage.tokens).toHaveLength(0);
  });
});

describe("createPdfForUser", () => {
  it("registers an uploaded PDF with its stored size", async () => {
    storage.blobs.set(OWN_PDF, { size: 2048, contentType: "application/pdf" });

    const result = await createPdfForUser("user-1", createInput());

    expect(result).toMatchObject({ success: true, folderId: "folder-1" });
    expect(insertedRows[0]).toMatchObject({
      title: "Book",
      blobPathname: OWN_PDF,
      sizeBytes: 2048,
      userId: "user-1",
    });
  });

  it.each([
    "notorium/pdfs/user-2/id-book.pdf",
    "notorium/notes/user-1/id-image.png",
    "../secret",
  ])("refuses a file the user did not upload as a PDF: %s", async (path) => {
    const result = await createPdfForUser("user-1", createInput(path));

    expect(result).toMatchObject({ errorCode: "pdfs.invalidData" });
    expect(insertedRows).toHaveLength(0);
  });

  it("refuses a stored file that is not a PDF", async () => {
    storage.blobs.set(OWN_PDF, { size: 10, contentType: "text/html" });

    const result = await createPdfForUser("user-1", createInput());

    expect(result).toMatchObject({ errorCode: "pdfs.notPdf" });
  });

  it("refuses a stored file over the size limit", async () => {
    storage.blobs.set(OWN_PDF, {
      size: LIMITS.pdfMaxBytes + 1,
      contentType: "application/pdf",
    });

    const result = await createPdfForUser("user-1", createInput());

    expect(result).toMatchObject({ errorCode: "limits.pdfSizeLimit" });
  });

  it("reports an upload that never reached storage", async () => {
    const result = await createPdfForUser("user-1", createInput());

    expect(result).toMatchObject({ errorCode: "pdfs.uploadMissing" });
  });
});
