import type { DocumentCapacityRule } from "@/features/documents/move-target";
import { countPdfsBySubjectForUser } from "@/features/pdfs/queries";
import { LIMITS } from "@/lib/config/limits";

export const pdfCapacityRule: DocumentCapacityRule = {
  countInSubject: countPdfsBySubjectForUser,
  max: LIMITS.maxPdfsPerSubject,
  limitErrorCode: "limits.pdfLimit",
};
