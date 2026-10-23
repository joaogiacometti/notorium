import { describe, expect, it, vi } from "vitest";
import { flashcard, type mindmap, note } from "@/db/schema";
import type { StoredBlobEntry } from "@/lib/media-storage/provider";

const { getDbMock, getMediaStorageProviderMock } = vi.hoisted(() => ({
  getDbMock: vi.fn(),
  getMediaStorageProviderMock: vi.fn(),
}));

vi.mock("@/db/index", () => ({ getDb: getDbMock }));
vi.mock("@/lib/media-storage/provider", () => ({
  getMediaStorageProvider: getMediaStorageProviderMock,
}));

const SHARED_PATHNAME = "notorium/notes/user-1/shared.png";
const SHARED_URL = `/api/attachments/blob?pathname=${encodeURIComponent(SHARED_PATHNAME)}`;
const SHARED_HTML = `<p><img src="${SHARED_URL}"></p>`;

class AttachmentRowsFake {
  notes: { content: string }[] = [];
  cards: { front: string; back: string }[] = [];
  maps: { data: string }[] = [];

  select() {
    return {
      from: async (table: typeof note | typeof flashcard | typeof mindmap) => {
        if (table === note) return this.notes;
        if (table === flashcard) return this.cards;
        return this.maps;
      },
    };
  }
}

class LifecycleStorageFake {
  readonly pathnames = new Set([SHARED_PATHNAME]);

  async listImageEntries(): Promise<StoredBlobEntry[]> {
    return [...this.pathnames].map((pathname) => ({
      pathname,
      uploadedAt: new Date(0),
    }));
  }

  async deleteImages(input: { pathnames: string[] }): Promise<void> {
    for (const pathname of input.pathnames) this.pathnames.delete(pathname);
  }
}

describe("shared attachment lifecycle", () => {
  it("preserves the shared image after one of two saved references is removed", async () => {
    const rows = new AttachmentRowsFake();
    const storage = new LifecycleStorageFake();
    rows.notes = [{ content: SHARED_HTML }, { content: SHARED_HTML }];
    getDbMock.mockReturnValue(rows);
    getMediaStorageProviderMock.mockResolvedValue(storage);
    const { sweepOrphanBlobs } = await import("@/features/attachments/blob-gc");

    rows.notes.splice(0, 1);

    expect(await sweepOrphanBlobs()).toMatchObject({ deleted: 0 });
    expect(storage.pathnames.has(SHARED_PATHNAME)).toBe(true);
    rows.notes = [];
    expect(await sweepOrphanBlobs()).toMatchObject({ deleted: 1 });
    expect(storage.pathnames.has(SHARED_PATHNAME)).toBe(false);
  });

  it("never deletes files when a database reference read fails", async () => {
    const storage = new LifecycleStorageFake();
    getDbMock.mockImplementationOnce(() => {
      throw new Error("Reference read unavailable");
    });
    getMediaStorageProviderMock.mockResolvedValue(storage);
    const { sweepOrphanBlobs } = await import("@/features/attachments/blob-gc");

    await expect(sweepOrphanBlobs()).rejects.toThrow(
      "Reference read unavailable",
    );
    expect(storage.pathnames.has(SHARED_PATHNAME)).toBe(true);
  });

  it.each(["note", "front", "back", "mindmap"] as const)(
    "keeps the blob while a %s references it, then collects it after the last reference is removed",
    async (surface) => {
      const rows = new AttachmentRowsFake();
      const storage = new LifecycleStorageFake();
      getDbMock.mockReturnValue(rows);
      getMediaStorageProviderMock.mockResolvedValue(storage);
      if (surface === "note") rows.notes = [{ content: SHARED_HTML }];
      if (surface === "front") rows.cards = [{ front: SHARED_HTML, back: "" }];
      if (surface === "back") rows.cards = [{ front: "", back: SHARED_HTML }];
      if (surface === "mindmap") {
        rows.maps = [
          {
            data: JSON.stringify({
              nodes: [
                {
                  id: "image",
                  position: { x: 0, y: 0 },
                  data: { label: "Image", imageUrl: SHARED_URL },
                },
              ],
              edges: [],
            }),
          },
        ];
      }
      const { sweepOrphanBlobs } = await import(
        "@/features/attachments/blob-gc"
      );

      expect(await sweepOrphanBlobs()).toMatchObject({
        deleted: 0,
        referenced: 1,
      });
      expect(storage.pathnames.has(SHARED_PATHNAME)).toBe(true);
      rows.notes = [];
      rows.cards = [];
      rows.maps = [];

      expect(await sweepOrphanBlobs()).toMatchObject({
        deleted: 1,
        referenced: 0,
      });
      expect(storage.pathnames.has(SHARED_PATHNAME)).toBe(false);
    },
  );
});
