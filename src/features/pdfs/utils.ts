import { PDF_MIME_TYPE } from "@/features/pdfs/validation";
import { LIMITS } from "@/lib/config/limits";
import { validationMessage } from "@/lib/validations/validation-messages";

const PDF_EXTENSION = /\.pdf$/i;

/**
 * A default document title from an uploaded file name: the extension is
 * dropped and the result is clipped to the title limit.
 *
 * @example pdfTitleFromFileName("Linear_Algebra.pdf"); // "Linear_Algebra"
 */
export function pdfTitleFromFileName(fileName: string): string {
  return fileName
    .replace(PDF_EXTENSION, "")
    .trim()
    .slice(0, LIMITS.pdfTitleMax);
}

/**
 * Checks a picked file before any upload starts. Returns a validation message
 * key (resolved by `FieldError`), or null when the file looks like a PDF within
 * the size limit. Some browsers leave `type` empty, so the extension is
 * accepted as well.
 *
 * @example getPdfFileProblem(file); // null | "Validation.pdfs.fileEmpty"
 */
export function getPdfFileProblem(file: {
  name: string;
  type: string;
  size: number;
}): string | null {
  const looksLikePdf =
    file.type === PDF_MIME_TYPE ||
    (file.type === "" && PDF_EXTENSION.test(file.name));
  if (!looksLikePdf) {
    return validationMessage("Validation.pdfs.fileRequired");
  }
  if (file.size === 0) {
    return validationMessage("Validation.pdfs.fileEmpty");
  }
  if (file.size > LIMITS.pdfMaxBytes) {
    return validationMessage("Validation.pdfs.fileMaxSize", {
      maxMb: LIMITS.pdfMaxMegabytes,
    });
  }
  return null;
}
