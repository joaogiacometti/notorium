import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeleteFolderDialog } from "@/components/folders/delete-folder-dialog";

vi.mock("@/app/actions/folders", () => ({
  deleteFolder: vi.fn(),
}));

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
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DeleteFolderDialog
            folderId="folder-1"
            folderName="test"
            open
            onOpenChange={vi.fn()}
          />
        </QueryClientProvider>,
      );
    });

    const description = container.querySelector(
      "[data-testid='dialog-description']",
    );
    const folderName = Array.from(container.querySelectorAll("span")).find(
      (element) => element.textContent === "test",
    );

    expect(description?.textContent).toBe(
      "Are you sure you want to delete test? This action cannot be undone. Nested folders and all associated notes, flashcards, and attachments will also be deleted.",
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
});

async function renderFolderDialog(root: Root, queryClient: QueryClient) {
  await act(async () => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <DeleteFolderDialog
          folderId="folder-1"
          folderName="test"
          open
          onOpenChange={vi.fn()}
        />
      </QueryClientProvider>,
    );
  });
}

function findButton(text: string, container: HTMLDivElement) {
  return Array.from(container.querySelectorAll("button")).find(
    (button) => button.textContent === text,
  );
}
