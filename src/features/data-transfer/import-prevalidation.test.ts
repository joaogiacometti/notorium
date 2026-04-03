import { describe, expect, it } from "vitest";
import {
  getImportPayloadBytes,
  preValidateImportStructure,
  validateSubjectImportLimits,
} from "@/features/data-transfer/import-prevalidation";

const validSubject = {
  name: "Mathematics",
  description: null,
  totalClasses: null,
  maxMisses: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  notes: [],
  attendanceMisses: [],
  assessments: [],
  flashcards: [],
};

describe("getImportPayloadBytes", () => {
  it("returns the encoded byte size of the payload", () => {
    expect(getImportPayloadBytes({ subjects: [] })).toBeGreaterThan(0);
  });
});

describe("preValidateImportStructure", () => {
  it("rejects raw payloads with too many subjects before schema parsing", () => {
    const result = preValidateImportStructure({
      subjects: Array.from({ length: 51 }, () => ({
        ...validSubject,
      })),
    });

    expect(result?.errorCode).toBe("limits.subjectImportLimit");
  });

  it("rejects raw payloads that exceed per-subject flashcard limits", () => {
    const result = preValidateImportStructure({
      subjects: [
        {
          ...validSubject,
          flashcards: Array.from({ length: 2001 }, () => ({})),
        },
      ],
    });

    expect(result?.errorCode).toBe("limits.flashcardLimit");
  });
});

describe("validateSubjectImportLimits", () => {
  it("rejects parsed subjects with too many notes", () => {
    const result = validateSubjectImportLimits([
      {
        ...validSubject,
        notes: Array.from({ length: 101 }, () => ({
          title: "Lecture",
          content: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        })),
      },
    ]);

    expect(result?.errorCode).toBe("limits.noteLimit");
  });

  it("returns null when all parsed subject collections stay within limits", () => {
    expect(validateSubjectImportLimits([{ ...validSubject }])).toBeNull();
  });
});
