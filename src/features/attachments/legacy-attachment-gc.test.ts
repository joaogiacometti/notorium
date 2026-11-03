// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { importLegacyDocument } from "@/lib/editor/legacy-document-import";

const { rows, deleteImages, listImageEntries } = vi.hoisted(() => ({
  rows: { notes: [] as { content: unknown }[] },
  deleteImages: vi.fn(),
  listImageEntries: vi.fn(),
}));

vi.mock("@/db/index", () => ({
  getDb: () => ({
    select: () => ({
      from: (table: string) =>
        Promise.resolve(table === "note_table" ? rows.notes : []),
    }),
  }),
}));

vi.mock("@/db/schema", () => ({
  note: "note_table",
  flashcard: "flashcard_table",
  pdfDocument: { blobPathname: "pdf_document.blob_pathname" },
}));

vi.mock("@/lib/media-storage/provider", () => ({
  getMediaStorageProvider: async () => ({ listImageEntries, deleteImages }),
}));

const PATHNAME = "notorium/notes/u/a.png";
const URL_TO_BLOB = `/api/attachments/blob?pathname=${PATHNAME}`;

/** A stored note whose only reference to the blob is the given legacy HTML. */
async function sweepWithLegacyNote(html: string) {
  rows.notes = [{ content: importLegacyDocument(html) }];
  const { sweepOrphanBlobs } = await import("@/features/attachments/blob-gc");
  return sweepOrphanBlobs();
}

describe("orphan sweep after converting legacy note HTML", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listImageEntries.mockResolvedValue([
      { pathname: PATHNAME, uploadedAt: new Date(0) },
    ]);
  });

  it("keeps a blob referenced by an image element", async () => {
    await sweepWithLegacyNote(`<img src="${URL_TO_BLOB}" alt="">`);

    expect(deleteImages).not.toHaveBeenCalled();
  });

  // The legacy renderer showed these paragraphs as images and counted them as
  // references, so their blobs must survive the conversion to documents.
  it.each([
    ["plain text", `<p>${URL_TO_BLOB}</p>`],
    ["a link", `<p><a href="${URL_TO_BLOB}">${URL_TO_BLOB}</a></p>`],
  ])(
    "keeps a blob referenced by a paragraph holding only %s",
    async (_, html) => {
      await sweepWithLegacyNote(html);

      expect(deleteImages).not.toHaveBeenCalled();
    },
  );

  it("still deletes a blob nothing references", async () => {
    await sweepWithLegacyNote("<p>No attachment here</p>");

    expect(deleteImages).toHaveBeenCalledWith({ pathnames: [PATHNAME] });
  });
});
