import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import type { DocumentListItem } from "@/features/documents/types";
import {
  invalidateDocumentViews,
  invalidateFlashcardViews,
  invalidateFolderViews,
} from "@/lib/client-cache/invalidation";
import { folderDocumentsQuery, libraryKeys } from "@/lib/client-cache/queries";

const { fetchDocuments } = vi.hoisted(() => ({ fetchDocuments: vi.fn() }));
vi.mock("@/lib/read-api/documents", () => ({
  fetchFolderDocuments: fetchDocuments,
}));

function noteRow(title: string): DocumentListItem {
  return {
    id: "note",
    title,
    kind: "note",
    folderId: "folder",
    updatedAt: new Date("2026-01-01"),
  };
}

const client = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});
afterEach(() => {
  client.clear();
  vi.resetAllMocks();
});

it("invalidates both sides of a document move and cached backlinks, leaving unrelated folders fresh", async () => {
  for (const id of ["source", "destination", "unrelated"])
    client.setQueryData(libraryKeys.folderDocuments(id), []);
  client.setQueryData(libraryKeys.connections("linked-note"), {
    backlinks: [],
  });
  client.setQueryData(libraryKeys.searchResults("owner", "title"), {
    notes: [],
  });

  await invalidateDocumentViews(client, ["source", "destination"]);

  expect(
    client.getQueryState(libraryKeys.folderDocuments("source"))?.isInvalidated,
  ).toBe(true);
  expect(
    client.getQueryState(libraryKeys.folderDocuments("destination"))
      ?.isInvalidated,
  ).toBe(true);
  expect(
    client.getQueryState(libraryKeys.folderDocuments("unrelated"))
      ?.isInvalidated,
  ).toBe(false);
  expect(
    client.getQueryState(libraryKeys.connections("linked-note"))?.isInvalidated,
  ).toBe(true);
  expect(
    client.getQueryState(libraryKeys.searchResults("owner", "title"))
      ?.isInvalidated,
  ).toBe(true);
});

it("a folder change expires pickers, document lists, search, and all cached flashcard pages", async () => {
  const keys = [
    libraryKeys.folderOptions,
    libraryKeys.folderDocuments("child"),
    libraryKeys.searchResults("owner", "term"),
    [...libraryKeys.flashcards, { pageIndex: 0 }],
    [...libraryKeys.flashcards, { pageIndex: 1 }],
  ];
  for (const key of keys) client.setQueryData(key, []);
  await invalidateFolderViews(client);
  for (const key of keys)
    expect(client.getQueryState(key)?.isInvalidated).toBe(true);
});

it("flashcard writes expire other cached pages without reloading document lists", async () => {
  client.setQueryData(
    [...libraryKeys.flashcards, { filter: "study-later" }],
    [],
  );
  client.setQueryData(libraryKeys.searchResults("owner", "term"), []);
  client.setQueryData(libraryKeys.folderDocuments("folder"), []);
  await invalidateFlashcardViews(client);
  expect(
    client.getQueryState([...libraryKeys.flashcards, { filter: "study-later" }])
      ?.isInvalidated,
  ).toBe(true);
  expect(
    client.getQueryState(libraryKeys.searchResults("owner", "term"))
      ?.isInvalidated,
  ).toBe(true);
  expect(
    client.getQueryState(libraryKeys.folderDocuments("folder"))?.isInvalidated,
  ).toBe(false);
});

it("replaces a pre-write initial load and ignores its late response", async () => {
  let resolveOld!: (value: DocumentListItem[]) => void;
  const oldResponse = new Promise<DocumentListItem[]>((resolve) => {
    resolveOld = resolve;
  });
  const saved = [noteRow("Saved title")];
  fetchDocuments.mockReturnValueOnce(oldResponse).mockResolvedValueOnce(saved);
  const options = folderDocumentsQuery("folder");
  const observer = new QueryObserver(client, options);
  const unsubscribe = observer.subscribe(() => {});
  try {
    await invalidateDocumentViews(client, ["folder"]);
    expect(client.getQueryData(options.queryKey)).toEqual(saved);
    resolveOld([noteRow("Old title")]);
    await oldResponse;
    expect(client.getQueryData(options.queryKey)).toEqual(saved);
  } finally {
    unsubscribe();
  }
});

it("leaves a retryable query error when refresh fails without rejecting the successful write", async () => {
  const options = folderDocumentsQuery("folder");
  client.setQueryData(options.queryKey, [noteRow("Old title")]);
  fetchDocuments.mockRejectedValue(new Error("offline"));
  const observer = new QueryObserver(client, options);
  const unsubscribe = observer.subscribe(() => {});
  try {
    await expect(
      invalidateDocumentViews(client, ["folder"]),
    ).resolves.toBeUndefined();
    expect(observer.getCurrentResult().isError).toBe(true);
    fetchDocuments.mockResolvedValue([noteRow("Saved title")]);
    await observer.refetch();
    expect(observer.getCurrentResult().isError).toBe(false);
    expect(client.getQueryData(options.queryKey)).toEqual([
      noteRow("Saved title"),
    ]);
  } finally {
    unsubscribe();
  }
});
