import { describe, expect, it } from "vitest";
import {
  createPdfSchema,
  preparePdfUploadSchema,
  renamePdfSchema,
  savePdfReadingPageSchema,
} from "@/features/pdfs/validation";
import { LIMITS } from "@/lib/config/limits";

describe("preparePdfUploadSchema", () => {
  it("accepts a subject, file name, and positive size", () => {
    const result = preparePdfUploadSchema.safeParse({
      subjectId: "s1",
      fileName: "book.pdf",
      sizeBytes: 1024,
    });

    expect(result.success).toBe(true);
  });

  it("rejects an empty file", () => {
    const result = preparePdfUploadSchema.safeParse({
      subjectId: "s1",
      fileName: "book.pdf",
      sizeBytes: 0,
    });

    expect(result.success).toBe(false);
  });
});

describe("createPdfSchema", () => {
  it("trims the title", () => {
    const result = createPdfSchema.parse({
      subjectId: "s1",
      title: "  Calculus  ",
      fileName: "calc.pdf",
      blobPathname: "notorium/pdfs/u/id-calc.pdf",
    });

    expect(result.title).toBe("Calculus");
  });

  it("rejects a blank title", () => {
    const result = createPdfSchema.safeParse({
      subjectId: "s1",
      title: "   ",
      fileName: "calc.pdf",
      blobPathname: "notorium/pdfs/u/id-calc.pdf",
    });

    expect(result.success).toBe(false);
  });
});

describe("renamePdfSchema", () => {
  it("rejects a title over the limit", () => {
    const result = renamePdfSchema.safeParse({
      id: "p1",
      title: "a".repeat(LIMITS.pdfTitleMax + 1),
    });

    expect(result.success).toBe(false);
  });
});

describe("savePdfReadingPageSchema", () => {
  it("accepts a page within the document", () => {
    const result = savePdfReadingPageSchema.safeParse({
      id: "p1",
      page: 3,
      pageCount: 10,
    });

    expect(result.success).toBe(true);
  });

  it.each([0, 1.5, -2])("rejects page %s", (page) => {
    const result = savePdfReadingPageSchema.safeParse({
      id: "p1",
      page,
      pageCount: 10,
    });

    expect(result.success).toBe(false);
  });
});
