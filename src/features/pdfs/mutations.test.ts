import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  updateCalls,
  updateReturning,
  getPdfByIdForUserMock,
  getSubjectRecordForUserMock,
  countPdfsBySubjectForUserMock,
} = vi.hoisted(() => ({
  updateCalls: [] as Record<string, unknown>[],
  updateReturning: { rows: [] as { subjectId: string }[] },
  getPdfByIdForUserMock: vi.fn(),
  getSubjectRecordForUserMock: vi.fn(),
  countPdfsBySubjectForUserMock: vi.fn(),
}));

vi.mock("@/db/index", () => ({
  getDb: () => ({
    update: () => ({
      set: (values: Record<string, unknown>) => {
        updateCalls.push(values);
        const where = Promise.resolve();
        return {
          where: () =>
            Object.assign(where, {
              returning: async () => updateReturning.rows,
            }),
        };
      },
    }),
  }),
}));
vi.mock("@/features/pdfs/queries", () => ({
  getPdfByIdForUser: getPdfByIdForUserMock,
  countPdfsBySubjectForUser: countPdfsBySubjectForUserMock,
}));
vi.mock("@/features/subjects/queries", () => ({
  getSubjectRecordForUser: getSubjectRecordForUserMock,
}));

import {
  movePdfForUser,
  savePdfReadingPageForUser,
} from "@/features/pdfs/mutations";
import { LIMITS } from "@/lib/config/limits";

beforeEach(() => {
  vi.clearAllMocks();
  updateCalls.length = 0;
  updateReturning.rows = [{ subjectId: "subject-1" }];
  getPdfByIdForUserMock.mockResolvedValue({ id: "p1", subjectId: "subject-1" });
  getSubjectRecordForUserMock.mockResolvedValue({ id: "subject-2" });
  countPdfsBySubjectForUserMock.mockResolvedValue(0);
});

describe("savePdfReadingPageForUser", () => {
  it("stores the page and page count without touching updatedAt", async () => {
    const result = await savePdfReadingPageForUser("user-1", {
      id: "p1",
      page: 12,
      pageCount: 340,
    });

    expect(result).toEqual({ success: true, subjectId: "subject-1" });
    expect(updateCalls[0]).toMatchObject({ lastPage: 12, pageCount: 340 });
    expect(updateCalls[0]?.updatedAt).toBeDefined();
    expect(updateCalls[0]?.updatedAt).not.toBeInstanceOf(Date);
  });

  it("clamps a page beyond the document to its last page", async () => {
    await savePdfReadingPageForUser("user-1", {
      id: "p1",
      page: 999,
      pageCount: 340,
    });

    expect(updateCalls[0]).toMatchObject({ lastPage: 340 });
  });

  it("reports a PDF the user does not own", async () => {
    updateReturning.rows = [];

    const result = await savePdfReadingPageForUser("user-1", {
      id: "other",
      page: 1,
      pageCount: 1,
    });

    expect(result).toMatchObject({ errorCode: "pdfs.notFound" });
  });
});

describe("movePdfForUser", () => {
  it("reparents the PDF and reports both subjects", async () => {
    const result = await movePdfForUser("user-1", {
      id: "p1",
      subjectId: "subject-2",
    });

    expect(result).toEqual({
      success: true,
      subjectId: "subject-2",
      previousSubjectId: "subject-1",
    });
    expect(updateCalls[0]).toEqual({ subjectId: "subject-2" });
  });

  it("rejects a destination at its PDF limit", async () => {
    countPdfsBySubjectForUserMock.mockResolvedValue(LIMITS.maxPdfsPerSubject);

    const result = await movePdfForUser("user-1", {
      id: "p1",
      subjectId: "subject-2",
    });

    expect(result).toMatchObject({ errorCode: "limits.pdfLimit" });
    expect(updateCalls).toHaveLength(0);
  });

  it("is a no-op when the subject is unchanged", async () => {
    const result = await movePdfForUser("user-1", {
      id: "p1",
      subjectId: "subject-1",
    });

    expect(result).toMatchObject({ success: true, subjectId: "subject-1" });
    expect(updateCalls).toHaveLength(0);
  });
});
