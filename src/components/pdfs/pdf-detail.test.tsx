import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type AssistantWorkspace,
  AssistantWorkspaceContext,
} from "@/components/assistant/assistant-workspace-context";
import { PdfDetail } from "@/components/pdfs/pdf-detail";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/app/actions/notes", () => ({
  deleteNote: vi.fn(),
  editNote: vi.fn(),
}));

vi.mock("@/app/actions/pdfs", () => ({
  deletePdf: vi.fn(),
  renamePdf: vi.fn(),
}));

vi.mock("@/components/pdfs/lazy-pdf-reader", () => ({
  LazyPdfReader: () => <div data-testid="pdf-reader" />,
}));

const pdf = {
  id: "pdf-1",
  title: "Cell biology",
  folderId: "folder-1",
  fileName: "cell-biology.pdf",
  blobPathname: "pdfs/user-1/cell-biology.pdf",
  lastPage: 1,
};

/** Workspace fake that records which elements host the assistant panel. */
function createWorkspaceFake() {
  const hosts: HTMLElement[] = [];
  const workspace = {
    open: false,
    setOpen: vi.fn(),
    registerHost: (host: HTMLElement) => {
      hosts.push(host);
      return () => {
        hosts.splice(hosts.indexOf(host), 1);
      };
    },
    registerInlineLauncher: () => () => {},
  } as unknown as AssistantWorkspace;
  return { hosts, workspace };
}

function clickButton(container: HTMLElement, label: string) {
  container
    .querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)
    ?.click();
}

describe("PdfDetail", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("hosts the assistant inside zen mode so asking still reaches it", async () => {
    const { hosts, workspace } = createWorkspaceFake();
    await act(async () => {
      root.render(
        <QueryClientProvider client={new QueryClient()}>
          <AssistantWorkspaceContext.Provider value={workspace}>
            <PdfDetail pdf={pdf} folderName="Folder 1" />
          </AssistantWorkspaceContext.Provider>
        </QueryClientProvider>,
      );
    });

    expect(hosts).toHaveLength(0);

    await act(async () => clickButton(container, "Enter zen mode"));

    expect(hosts).toHaveLength(1);
    expect(container.contains(hosts[0] ?? null)).toBe(true);
    expect(
      container.querySelector('button[aria-label="Open assistant"]'),
    ).toBeTruthy();

    await act(async () => clickButton(container, "Exit zen mode"));

    expect(hosts).toHaveLength(0);
  });
});
