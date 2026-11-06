import type { DocumentCapacityRule } from "@/features/documents/move-target";
import { countPdfsByFolderForUser } from "@/features/pdfs/queries";
import { LIMITS } from "@/lib/config/limits";

export const pdfCapacityRule: DocumentCapacityRule = {
  countInFolder: countPdfsByFolderForUser,
  max: LIMITS.maxPdfsPerFolder,
  limitErrorCode: "limits.pdfLimit",
};
