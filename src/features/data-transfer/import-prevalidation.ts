import type { ImportData } from "@/features/data-transfer/validation";
import { LIMITS } from "@/lib/config/limits";
import {
  type ActionErrorResult,
  actionError,
} from "@/lib/server/server-action-errors";

export function getImportPayloadBytes(raw: unknown): number {
  const rawPayload = JSON.stringify(raw);

  return new TextEncoder().encode(rawPayload).length;
}

export function preValidateImportStructure(
  raw: unknown,
): ActionErrorResult | null {
  const subjects = getRawImportSubjects(raw);
  if (!subjects) {
    return null;
  }

  if (subjects.length > LIMITS.maxSubjects) {
    return actionError("limits.subjectImportLimit", {
      errorParams: { max: LIMITS.maxSubjects },
    });
  }

  for (const entry of subjects) {
    const entryLimitError = validateRawSubjectLimit(entry);
    if (entryLimitError) {
      return entryLimitError;
    }
  }

  return null;
}

export function validateSubjectImportLimits(
  subjects: ImportData["subjects"],
): ActionErrorResult | null {
  for (const importedSubject of subjects) {
    if (importedSubject.notes.length > LIMITS.maxNotesPerSubject) {
      return actionError("limits.noteLimit", {
        errorParams: { max: LIMITS.maxNotesPerSubject },
      });
    }

    if (importedSubject.assessments.length > LIMITS.maxAssessmentsPerSubject) {
      return actionError("limits.assessmentLimit", {
        errorParams: { max: LIMITS.maxAssessmentsPerSubject },
      });
    }
  }

  return null;
}

function getRawImportSubjects(raw: unknown): unknown[] | null {
  if (typeof raw !== "object" || raw === null || !("subjects" in raw)) {
    return null;
  }

  return Array.isArray(raw.subjects) ? raw.subjects : null;
}

function validateRawSubjectLimit(entry: unknown): ActionErrorResult | null {
  if (typeof entry !== "object" || entry === null) {
    return null;
  }

  const rawSubject = entry as Record<string, unknown>;

  return (
    validateRawCollectionLimit(
      rawSubject.notes,
      LIMITS.maxNotesPerSubject,
      "limits.noteLimit",
    ) ??
    validateRawCollectionLimit(
      rawSubject.assessments,
      LIMITS.maxAssessmentsPerSubject,
      "limits.assessmentLimit",
    )
  );
}

function validateRawCollectionLimit(
  value: unknown,
  max: number,
  errorKey: "limits.noteLimit" | "limits.assessmentLimit",
): ActionErrorResult | null {
  if (!Array.isArray(value) || value.length <= max) {
    return null;
  }

  return actionError(errorKey, {
    errorParams: { max },
  });
}
