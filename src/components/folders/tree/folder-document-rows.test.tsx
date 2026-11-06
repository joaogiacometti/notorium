import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { FolderDocumentRows } from "@/components/folders/tree/folder-document-rows";
import { invalidateDocumentViews } from "@/lib/client-cache/invalidation";

const { fetchDocuments } = vi.hoisted(() => ({ fetchDocuments: vi.fn() }));
vi.mock("@/lib/read-api/documents", () => ({
  fetchFolderDocuments: fetchDocuments,
}));
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

let client: QueryClient;
let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  client = new QueryClient();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  client.clear();
  container.remove();
  vi.resetAllMocks();
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = false;
});

const rowProps = {
  folderId: "folder",
  depth: 1,
  activeHref: "/",
  documentActions: {},
  draggedDocumentId: null,
  pendingMoveId: null,
  onDocumentDragStart: () => {},
  onDragEnd: () => {},
};

async function flushQueries() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function renderFolders() {
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <FolderDocumentRows {...rowProps} />
        <FolderDocumentRows {...rowProps} />
      </QueryClientProvider>,
    );
  });
  await flushQueries();
}

it("shares one load across sidebar instances and updates both after a document change", async () => {
  fetchDocuments.mockResolvedValue([
    { id: "note", kind: "note", folderId: "folder", title: "Original" },
  ]);
  await renderFolders();
  expect(fetchDocuments).toHaveBeenCalledTimes(1);
  expect(container.querySelectorAll('a span[title="Original"]').length).toBe(2);

  fetchDocuments.mockResolvedValue([
    { id: "note", kind: "note", folderId: "folder", title: "Renamed" },
  ]);
  await act(async () => invalidateDocumentViews(client, ["folder"]));
  await flushQueries();
  expect(container.textContent).not.toContain("Original");
  expect(container.querySelectorAll('a span[title="Renamed"]').length).toBe(2);
});

it("shows loading and lets a failed folder load be retried", async () => {
  let reject!: (error: Error) => void;
  fetchDocuments.mockReturnValue(
    new Promise((_resolve, rejectPromise) => {
      reject = rejectPromise;
    }),
  );
  await renderFolders();
  expect(container.textContent).toContain("Loading…");
  await act(async () => reject(new Error("offline")));
  await flushQueries();
  expect(container.querySelector('[role="alert"]')?.textContent).toContain(
    "Couldn't load documents.",
  );

  fetchDocuments.mockResolvedValue([
    { id: "note", kind: "note", folderId: "folder", title: "Recovered" },
  ]);
  await act(async () => {
    container.querySelector<HTMLButtonElement>("button")?.click();
  });
  await flushQueries();
  expect(container.querySelector('[role="alert"]')).toBeNull();
  expect(container.querySelectorAll('a span[title="Recovered"]').length).toBe(
    2,
  );
});
