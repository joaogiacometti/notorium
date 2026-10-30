import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/pdfs", () => ({
  createPdf: vi.fn(),
  preparePdfUpload: vi.fn(),
}));

vi.mock("@vercel/blob/client", () => ({ put: vi.fn() }));

import type {
  CreatePdfForm,
  PreparePdfUploadForm,
} from "@/features/pdfs/validation";
import {
  type PdfStorageUpload,
  type PdfUploadSteps,
  uploadPdfDocument,
} from "@/lib/attachments/upload-pdf-document";
import { actionError } from "@/lib/server/server-action-errors";

class FakePdfUploadSteps implements PdfUploadSteps {
  readonly uploads: PdfStorageUpload[] = [];
  readonly created: CreatePdfForm[] = [];
  prepareFails = false;
  storageFails = false;

  prepare = async (data: PreparePdfUploadForm) => {
    if (this.prepareFails) return actionError("limits.pdfLimit");
    return {
      success: true as const,
      pathname: `notorium/pdfs/u/id-${data.fileName}`,
      clientToken: "token",
    };
  };

  uploadFile = async (upload: PdfStorageUpload) => {
    if (this.storageFails) throw new Error("network down");
    this.uploads.push(upload);
    upload.onProgress(100);
  };

  create = async (data: CreatePdfForm) => {
    this.created.push(data);
    return { success: true as const, subjectId: data.subjectId, pdfId: "p1" };
  };
}

function makeFile(): File {
  return new File(["%PDF-1.7"], "book.pdf", { type: "application/pdf" });
}

describe("uploadPdfDocument", () => {
  it("uploads to the prepared pathname, then registers the document", async () => {
    const steps = new FakePdfUploadSteps();
    const onProgress = vi.fn();

    const result = await uploadPdfDocument(
      { subjectId: "s1", title: "Book", file: makeFile(), onProgress },
      steps,
    );

    expect(result).toEqual({ success: true, subjectId: "s1", pdfId: "p1" });
    expect(steps.uploads[0]?.pathname).toBe("notorium/pdfs/u/id-book.pdf");
    expect(steps.created[0]).toEqual({
      subjectId: "s1",
      title: "Book",
      fileName: "book.pdf",
      blobPathname: "notorium/pdfs/u/id-book.pdf",
    });
    expect(onProgress).toHaveBeenCalledWith(100);
  });

  it("stops before uploading when the server refuses the upload", async () => {
    const steps = new FakePdfUploadSteps();
    steps.prepareFails = true;

    const result = await uploadPdfDocument(
      { subjectId: "s1", title: "Book", file: makeFile(), onProgress: vi.fn() },
      steps,
    );

    expect(result).toMatchObject({ errorCode: "limits.pdfLimit" });
    expect(steps.uploads).toHaveLength(0);
  });

  it("returns an upload error instead of throwing when storage fails", async () => {
    const steps = new FakePdfUploadSteps();
    steps.storageFails = true;

    const result = await uploadPdfDocument(
      { subjectId: "s1", title: "Book", file: makeFile(), onProgress: vi.fn() },
      steps,
    );

    expect(result).toMatchObject({ errorCode: "attachments.uploadFailed" });
    expect(steps.created).toHaveLength(0);
  });
});
