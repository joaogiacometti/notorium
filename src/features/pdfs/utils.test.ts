import { describe, expect, it } from "vitest";
import { getPdfFileProblem, pdfTitleFromFileName } from "@/features/pdfs/utils";
import { LIMITS } from "@/lib/config/limits";
import { resolveValidationMessages } from "@/lib/validations/validation-messages";

function fileProblemText(file: { name: string; type: string; size: number }) {
  return resolveValidationMessages(getPdfFileProblem(file) ?? undefined);
}

describe("pdfTitleFromFileName", () => {
  it("drops the extension", () => {
    expect(pdfTitleFromFileName("Linear Algebra.PDF")).toBe("Linear Algebra");
  });

  it("clips long names to the title limit", () => {
    const title = pdfTitleFromFileName(`${"a".repeat(300)}.pdf`);
    expect(title).toHaveLength(LIMITS.pdfTitleMax);
  });
});

describe("getPdfFileProblem", () => {
  it("accepts a PDF within the size limit", () => {
    expect(
      getPdfFileProblem({ name: "a.pdf", type: "application/pdf", size: 10 }),
    ).toBeNull();
  });

  it("accepts a .pdf file whose browser type is empty", () => {
    expect(getPdfFileProblem({ name: "a.pdf", type: "", size: 10 })).toBeNull();
  });

  it("rejects other file types", () => {
    expect(
      fileProblemText({ name: "a.png", type: "image/png", size: 10 }),
    ).toBe("Choose a PDF file.");
  });

  it("rejects an empty file", () => {
    expect(
      fileProblemText({ name: "a.pdf", type: "application/pdf", size: 0 }),
    ).toBe("This file is empty.");
  });

  it("rejects files over the size limit", () => {
    expect(
      fileProblemText({
        name: "a.pdf",
        type: "application/pdf",
        size: LIMITS.pdfMaxBytes + 1,
      }),
    ).toBe("PDFs can be at most 100 MB.");
  });
});
