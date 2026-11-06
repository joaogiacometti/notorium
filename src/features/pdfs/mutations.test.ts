import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  updateCalls,
  updateReturning,
  getPdfByIdForUserMock,
  getFolderRecordForUserMock,
  countPdfsByFolderForUserMock,
} = vi.hoisted(() => ({
  updateCalls: [] as Record<string, unknown>[],
  updateReturning: { rows: [] as { folderId: string }[] },
  getPdfByIdForUserMock: vi.fn(),
  getFolderRecordForUserMock: vi.fn(),
  countPdfsByFolderForUserMock: vi.fn(),
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
  countPdfsByFolderForUser: countPdfsByFolderForUserMock,
}));
vi.mock("@/features/folders/queries", () => ({
  getFolderRecordForUser: getFolderRecordForUserMock,
}));

import {
  movePdfForUser,
  savePdfReadingPageForUser,
} from "@/features/pdfs/mutations";
import { LIMITS } from "@/lib/config/limits";

beforeEach(() => {
  vi.clearAllMocks();
  updateCalls.length = 0;
  updateReturning.rows = [{ folderId: "folder-1" }];
  getPdfByIdForUserMock.mockResolvedValue({ id: "p1", folderId: "folder-1" });
  getFolderRecordForUserMock.mockResolvedValue({ id: "folder-2" });
  countPdfsByFolderForUserMock.mockResolvedValue(0);
});

describe("savePdfReadingPageForUser", () => {
  it("stores the page and page count without touching updatedAt", async () => {
    const result = await savePdfReadingPageForUser("user-1", {
      id: "p1",
      page: 12,
      pageCount: 340,
    });

    expect(result).toEqual({ success: true, folderId: "folder-1" });
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
  it("reparents the PDF and reports both folders", async () => {
    const result = await movePdfForUser("user-1", {
      id: "p1",
      folderId: "folder-2",
    });

    expect(result).toEqual({
      success: true,
      folderId: "folder-2",
      previousFolderId: "folder-1",
    });
    expect(updateCalls[0]).toEqual({ folderId: "folder-2" });
  });

  it("rejects a destination at its PDF limit", async () => {
    countPdfsByFolderForUserMock.mockResolvedValue(LIMITS.maxPdfsPerFolder);

    const result = await movePdfForUser("user-1", {
      id: "p1",
      folderId: "folder-2",
    });

    expect(result).toMatchObject({ errorCode: "limits.pdfLimit" });
    expect(updateCalls).toHaveLength(0);
  });

  it("is a no-op when the folder is unchanged", async () => {
    const result = await movePdfForUser("user-1", {
      id: "p1",
      folderId: "folder-1",
    });

    expect(result).toMatchObject({ success: true, folderId: "folder-1" });
    expect(updateCalls).toHaveLength(0);
  });
});
