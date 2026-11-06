import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCreateInlineFolderPicker } from "@/components/shared/use-create-inline-folder-picker";
import { libraryKeys } from "@/lib/client-cache/queries";
import type { FolderOption } from "@/lib/server/api-contracts";

const createFolderMock = vi.fn();
const getFolderOptionsMock = vi.fn();
const { toastErrorMock } = vi.hoisted(() => ({ toastErrorMock: vi.fn() }));

vi.mock("server-only", () => ({}));

vi.mock("@/app/actions/folders", () => ({
  createFolder: (...args: unknown[]) => createFolderMock(...args),
}));

vi.mock("@/lib/read-api/folders", () => ({
  fetchFolderOptions: (...args: unknown[]) => getFolderOptionsMock(...args),
}));

vi.mock("sonner", () => ({
  toast: { error: toastErrorMock },
}));

vi.mock("@/lib/server/server-action-errors", () => ({
  t: (code: string) => code,
}));

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

interface ProbeProps {
  initialFolders?: FolderOption[];
  loadFoldersOnOpen?: boolean;
  queryClient: QueryClient;
}

function Probe({
  initialFolders,
  loadFoldersOnOpen,
  queryClient,
}: Readonly<ProbeProps>) {
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const { folders, handleCreateFolder } = useCreateInlineFolderPicker({
    initialFolders,
    open: true,
    loadFoldersOnOpen,
    onFolderCreated: setSelectedFolderId,
  });

  return (
    <QueryClientProvider client={queryClient}>
      <span data-testid="folders">{folders.map((s) => s.path).join(",")}</span>
      <span data-testid="selected">{selectedFolderId}</span>
      <button
        type="button"
        onClick={() => {
          void handleCreateFolder("Biology");
        }}
      >
        Create
      </button>
    </QueryClientProvider>
  );
}

describe("useCreateInlineFolderPicker", () => {
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
    queryClient.clear();
    vi.resetAllMocks();
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
  });

  it("loads, creates, refreshes, and selects a new folder", async () => {
    getFolderOptionsMock
      .mockResolvedValueOnce([{ id: "folder-1", name: "Math", path: "Math" }])
      .mockResolvedValueOnce([
        { id: "folder-2", name: "Biology", path: "Biology" },
      ]);
    createFolderMock.mockResolvedValue({
      success: true,
      folderId: "folder-2",
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <Probe loadFoldersOnOpen queryClient={queryClient} />
        </QueryClientProvider>,
      );
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(
      container.querySelector('[data-testid="folders"]')?.textContent,
    ).toBe("Math");

    await act(async () => {
      container.querySelector("button")?.click();
    });

    expect(createFolderMock).toHaveBeenCalledWith({
      name: "Biology",
    });
    expect(
      container.querySelector('[data-testid="folders"]')?.textContent,
    ).toBe("Biology");
    expect(
      container.querySelector('[data-testid="selected"]')?.textContent,
    ).toBe("folder-2");
    expect(queryClient.getQueryData(libraryKeys.folderOptions)).toEqual([
      { id: "folder-2", name: "Biology", path: "Biology" },
    ]);
  });

  it("updates every mounted folder picker after inline creation", async () => {
    let options = [{ id: "folder-1", name: "Math", path: "Math" }];
    getFolderOptionsMock.mockImplementation(async () => options);
    createFolderMock.mockImplementation(async () => {
      options = [
        ...options,
        { id: "folder-2", name: "Biology", path: "Biology" },
      ];
      return { success: true, folderId: "folder-2" };
    });
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <Probe loadFoldersOnOpen queryClient={queryClient} />
          <Probe loadFoldersOnOpen queryClient={queryClient} />
        </QueryClientProvider>,
      );
    });
    await act(async () => {
      container.querySelector("button")?.click();
    });
    expect(
      Array.from(
        container.querySelectorAll('[data-testid="folders"]'),
        (element) => element.textContent,
      ),
    ).toEqual(["Math,Biology", "Math,Biology"]);
  });

  it("keeps the initial folders and reports a failed load on open", async () => {
    getFolderOptionsMock.mockRejectedValueOnce(new Error("network down"));

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <Probe
            initialFolders={
              [
                {
                  id: "folder-1",
                  name: "Math",
                  path: "Math",
                },
              ] as FolderOption[]
            }
            loadFoldersOnOpen
            queryClient={queryClient}
          />
        </QueryClientProvider>,
      );
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(
      container.querySelector('[data-testid="folders"]')?.textContent,
    ).toBe("Math");
    expect(toastErrorMock).toHaveBeenCalledWith("Could not load folders.");
  });

  it("still selects the created folder when the list refresh fails", async () => {
    getFolderOptionsMock.mockRejectedValueOnce(new Error("network down"));
    createFolderMock.mockResolvedValue({
      success: true,
      folderId: "folder-2",
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <Probe queryClient={queryClient} />
        </QueryClientProvider>,
      );
    });
    await act(async () => {
      container.querySelector("button")?.click();
    });

    expect(
      container.querySelector('[data-testid="selected"]')?.textContent,
    ).toBe("folder-2");
    expect(toastErrorMock).toHaveBeenCalledWith("Could not load folders.");
  });
});
