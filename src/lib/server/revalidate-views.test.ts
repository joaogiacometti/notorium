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

  it("refreshes planning and each affected subject for assessment writes", async () => {
    const { revalidateAssessmentViews } = await import("./revalidate-views");

    revalidateAssessmentViews(["math", "history"]);

    expect(revalidationLog.calls).toEqual([
      ["/planning", undefined],
      ["/subjects/math", undefined],
      ["/subjects/history", undefined],
    ]);
  });

  it("refreshes a document page together with its subject page", async () => {
    const { revalidateDocumentPage } = await import("./revalidate-views");

    revalidateDocumentPage("mindmaps", "math", "map-1");

    expect(revalidationLog.calls).toEqual([
      ["/subjects/math", undefined],
      ["/subjects/math/documents/mindmaps/map-1", undefined],
    ]);
  });
});
