import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeleteFolderDialog } from "@/components/folders/delete-folder-dialog";

vi.mock("@/app/actions/folders", () => ({
  deleteFolder: vi.fn(),
}));

const readApi = vi.hoisted(() => ({
  fetchFolderDeletionSummary: vi.fn(),
}));

vi.mock("@/lib/read-api/folders", () => readApi);

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
  DialogDescription: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <p data-testid="dialog-description" className={className}>
      {children}
    </p>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
}));

vi.mock("@/components/shared/async-button-content", () => ({
  AsyncButtonContent: ({
    idleLabel,
  }: {
    idleLabel: string;
    pending: boolean;
    pendingLabel: string;
  }) => idleLabel,
}));

vi.mock("@/lib/server/server-action-errors", () => ({
  t: () => "Request failed.",
}));

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

describe("DeleteFolderDialog", () => {
  let container: HTMLDivElement;
  let root: Root;
  let queryClient: QueryClient;

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    queryClient = new QueryClient();
    readApi.fetchFolderDeletionSummary.mockResolvedValue(emptySummary);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
    vi.clearAllMocks();
  });

  it("renders short folder names in a natural sentence", async () => {
    await renderFolderDialog(root, queryClient);

    const description = container.querySelector(
      "[data-testid='dialog-description']",
    );
    const folderName = Array.from(container.querySelectorAll("span")).find(
      (element) => element.textContent === "test",
    );

    expect(description?.textContent).toBe(
      "Are you sure you want to delete test and everything in it? This action cannot be undone.",
    );
    expect(description?.className).not.toContain("space-y-1");
    expect(folderName?.className).toContain("inline");
    expect(folderName?.className).not.toContain("block");
  });

  it("uses destructive styling when deleting a folder", async () => {
    await renderFolderDialog(root, queryClient);

    const deleteButton = findButton("Delete", container);

    expect(deleteButton?.dataset.variant).toBe("destructive");
  });

  it("lists what the deletion removes and hides zero counts", async () => {
    readApi.fetchFolderDeletionSummary.mockResolvedValue({
      nestedFolderCount: 1,
      noteCount: 12,
      pdfCount: 0,
      flashcardCount: 1248,
    });

    await renderFolderDialog(root, queryClient);

    expect(countRows(container)).toEqual([
      ["Nested folders", "1"],
      ["Notes", "12"],
      ["Flashcards", "1,248"],
    ]);
    expect(readApi.fetchFolderDeletionSummary).toHaveBeenCalledWith("folder-1");
  });

  it("shows no counts for an empty folder", async () => {
    await renderFolderDialog(root, queryClient);

    expect(container.querySelector("ul")).toBeNull();
    expect(
      container.querySelector("[aria-label='Counting folder contents']"),
    ).toBeNull();
  });

  it("enables delete once counts load", async () => {
    await renderFolderDialog(root, queryClient);

    expect(findButton("Delete", container)?.disabled).toBe(false);
  });

  it("keeps cancel available but blocks delete while counts load", async () => {
    readApi.fetchFolderDeletionSummary.mockReturnValue(new Promise(() => {}));
    const onOpenChange = vi.fn();

    await renderFolderDialog(root, queryClient, { onOpenChange });

    expect(
      container.querySelector("[aria-label='Counting folder contents']"),
    ).not.toBeNull();
    expect(findButton("Delete", container)?.disabled).toBe(true);
    await act(async () => {
      findButton("Cancel", container)?.click();
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("falls back to the generic warning and retries when counts fail", async () => {
    readApi.fetchFolderDeletionSummary
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ ...emptySummary, noteCount: 2 });

    await renderFolderDialog(root, queryClient);

    expect(container.textContent).toContain(
      "Nested folders and all associated notes, flashcards, and attachments will also be deleted.",
    );
    expect(container.textContent).toContain(
      "Couldn't load what will be deleted.",
    );

    await act(async () => {
      findButton("Retry", container)?.click();
    });
    await flushQueries();

    expect(countRows(container)).toEqual([["Notes", "2"]]);
  });

  it("does not load counts while closed", async () => {
    await renderFolderDialog(root, queryClient, { open: false });

    expect(readApi.fetchFolderDeletionSummary).not.toHaveBeenCalled();
  });
});

const emptySummary = {
  nestedFolderCount: 0,
  noteCount: 0,
  pdfCount: 0,
  flashcardCount: 0,
};

async function renderFolderDialog(
  root: Root,
  queryClient: QueryClient,
  { open = true, onOpenChange = vi.fn() } = {},
) {
  await act(async () => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <DeleteFolderDialog
          folderId="folder-1"
          folderName="test"
          open={open}
          onOpenChange={onOpenChange}
        />
      </QueryClientProvider>,
    );
  });
  await flushQueries();
}

async function flushQueries() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

function countRows(container: HTMLDivElement) {
  return Array.from(container.querySelectorAll("li")).map((row) =>
    Array.from(row.querySelectorAll("span"), (cell) => cell.textContent),
  );
}

function findButton(text: string, container: HTMLDivElement) {
  return Array.from(container.querySelectorAll("button")).find(
    (button) => button.textContent === text,
  );
}
