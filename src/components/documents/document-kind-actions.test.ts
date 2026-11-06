import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { libraryKeys } from "@/lib/client-cache/queries";

vi.mock("@/app/actions/notes", () => ({
  editNote: vi.fn(),
  deleteNote: vi.fn(),
}));
vi.mock("@/app/actions/pdfs", () => ({
  renamePdf: vi.fn(),
  deletePdf: vi.fn(),
}));

import { runDocumentAction } from "@/components/documents/document-kind-actions";

function seededClient() {
  const client = new QueryClient();
  client.setQueryData(libraryKeys.searchResults("owner", "title"), {
    notes: [],
  });
  client.setQueryData(libraryKeys.folderDocuments("folder-1"), []);
  return client;
}

describe("runDocumentAction", () => {
  it("refreshes document lists and search after a successful rename or deletion", async () => {
    const client = seededClient();
    const result = await runDocumentAction(
      client,
      async () => ({ success: true }),
      "folder-1",
    );
    expect(result).toEqual({ success: true });
    expect(
      client.getQueryState(libraryKeys.searchResults("owner", "title"))
        ?.isInvalidated,
    ).toBe(true);
    expect(
      client.getQueryState(libraryKeys.folderDocuments("folder-1"))
        ?.isInvalidated,
    ).toBe(true);
    client.clear();
  });

  it("keeps existing views fresh when the write fails", async () => {
    const client = seededClient();
    const result = await runDocumentAction(
      client,
      async () => ({ errorCode: "notes.notFound" }),
      "folder-1",
    );
    expect(result).toEqual({ errorCode: "notes.notFound" });
    expect(
      client.getQueryState(libraryKeys.searchResults("owner", "title"))
        ?.isInvalidated,
    ).toBe(false);
    expect(
      client.getQueryState(libraryKeys.folderDocuments("folder-1"))
        ?.isInvalidated,
    ).toBe(false);
    client.clear();
  });
});
