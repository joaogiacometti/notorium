import { beforeEach, describe, expect, it, vi } from "vitest";

// Records each `revalidatePath(path, type)` call so tests assert which views a
// write refreshes without a Next.js runtime.
const revalidationLog = vi.hoisted(
  () =>
    new (class FakeRevalidationLog {
      calls: Array<[string, string | undefined]> = [];
      record(path: string, type?: string): void {
        this.calls.push([path, type]);
      }
    })(),
);

vi.mock("next/cache", () => ({
  revalidatePath: (path: string, type?: string) =>
    revalidationLog.record(path, type),
}));

describe("revalidate-views", () => {
  beforeEach(() => {
    revalidationLog.calls = [];
  });

  it("refreshes the root layout so the sidebar tree and every page reload", async () => {
    const { revalidateAppShell } = await import("./revalidate-views");

    revalidateAppShell();

    expect(revalidationLog.calls).toEqual([["/", "layout"]]);
  });

  it("refreshes a document page", async () => {
    const { revalidateDocumentPage } = await import("./revalidate-views");

    revalidateDocumentPage("notes", "math", "note-1");

    expect(revalidationLog.calls).toEqual([
      ["/subjects/math/documents/notes/note-1", undefined],
    ]);
  });
});
