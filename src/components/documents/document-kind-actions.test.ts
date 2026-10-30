import type { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/notes", () => ({
  editNote: vi.fn(),
  deleteNote: vi.fn(),
}));
vi.mock("@/app/actions/pdfs", () => ({
  renamePdf: vi.fn(),
  deletePdf: vi.fn(),
}));

import { runDocumentAction } from "@/components/documents/document-kind-actions";

class FakeQueryClient {
  readonly invalidated: unknown[] = [];

  async invalidateQueries(filters: unknown) {
    this.invalidated.push(filters);
  }

  asQueryClient(): QueryClient {
    return this as unknown as QueryClient;
  }
}

describe("runDocumentAction", () => {
  it("reloads cached search titles after a note change succeeds", async () => {
    const client = new FakeQueryClient();

    const result = await runDocumentAction(
      "note",
      client.asQueryClient(),
      async () => ({
        success: true,
      }),
    );

    expect(result).toEqual({ success: true });
    expect(client.invalidated).toEqual([{ queryKey: ["search-data"] }]);
  });

  it("leaves search data alone for kinds the search palette does not list", async () => {
    const client = new FakeQueryClient();

    await runDocumentAction("pdf", client.asQueryClient(), async () => ({
      success: true,
    }));

    expect(client.invalidated).toEqual([]);
  });

  it("returns a failure without touching search data", async () => {
    const client = new FakeQueryClient();

    const result = await runDocumentAction(
      "note",
      client.asQueryClient(),
      async () => ({
        errorCode: "notes.notFound",
      }),
    );

    expect(result).toEqual({ errorCode: "notes.notFound" });
    expect(client.invalidated).toEqual([]);
  });
});
