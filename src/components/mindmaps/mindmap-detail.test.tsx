import type { ReactNode } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MindmapDetail } from "@/components/mindmaps/mindmap-detail";
import type { DocumentListItem } from "@/features/documents/types";
import type { DeckOption, MindmapEntity } from "@/lib/server/api-contracts";

const { editMindmapMock, pushMock, toastErrorMock, toastSuccessMock } =
  vi.hoisted(() => ({
    editMindmapMock: vi.fn(),
    pushMock: vi.fn(),
    toastErrorMock: vi.fn(),
    toastSuccessMock: vi.fn(),
  }));

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/app/actions/mindmaps", () => ({
  editMindmap: editMindmapMock,
}));

vi.mock("sonner", () => ({
  toast: { error: toastErrorMock, success: toastSuccessMock },
}));

// The canvas is browser-only (React Flow); stub it with a button that pushes a
// changed graph upward so the detail's autosave path can be exercised.
let graphSeq = 0;
vi.mock("@/components/mindmaps/lazy-mindmap-canvas", () => ({
  LazyMindmapCanvas: ({
    onGraphChange,
  }: {
    onGraphChange: (graph: { nodes: unknown[]; edges: unknown[] }) => void;
  }) => {
    const pushEdit = () => {
      graphSeq += 1;
      onGraphChange({
        nodes: [
          {
            id: `n-${graphSeq}`,
            position: { x: 0, y: 0 },
            data: { label: "edited" },
          },
        ],
        edges: [],
      });
    };
    return (
      <button type="button" onClick={pushEdit}>
        edit-graph
      </button>
    );
  },
}));

vi.mock("@/components/documents/documents-nav", () => ({
  DocumentsNav: () => <nav />,
}));

vi.mock("@/components/mindmaps/delete-mindmap-dialog", () => ({
  DeleteMindmapDialog: () => null,
}));

vi.mock("@/components/mindmaps/edit-mindmap-title-dialog", () => ({
  EditMindmapTitleDialog: () => null,
}));

vi.mock("@/components/shared/app-page-container", () => ({
  AppPageContainer: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

const mindmap: MindmapEntity = {
  id: "mindmap-1",
  userId: "user-1",
  subjectId: "subject-1",
  title: "Cell biology",
  data: null,
  createdAt: new Date("2026-04-20T10:00:00.000Z"),
  updatedAt: new Date("2026-04-20T10:00:00.000Z"),
};

const deck: DeckOption = {
  id: "deck-1",
  userId: "user-1",
  parentDeckId: null,
  name: "Biology",
  path: "Biology",
  createdAt: new Date("2026-04-20T10:00:00.000Z"),
  updatedAt: new Date("2026-04-20T10:00:00.000Z"),
};

const documents: DocumentListItem[] = [
  {
    id: mindmap.id,
    title: mindmap.title,
    updatedAt: mindmap.updatedAt,
    kind: "mindmap",
    subjectId: mindmap.subjectId,
  },
];

function renderDetail(root: Root) {
  root.render(
    <MindmapDetail
      aiEnabled
      backHref="/subjects/subject-1"
      decks={[deck]}
      mindmap={mindmap}
      subjectName="Subject 1"
      documents={documents}
    />,
  );
}

function findButton(container: HTMLElement, text: string) {
  return Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes(text),
  );
}

async function clickEditGraph(container: HTMLElement) {
  await act(async () => {
    findButton(container, "edit-graph")?.click();
    await Promise.resolve();
  });
}

async function flushAutosave() {
  await act(async () => {
    vi.advanceTimersByTime(850);
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("MindmapDetail autosave", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    graphSeq = 0;
    editMindmapMock.mockReset();
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    act(() => {
      root = createRoot(container);
      renderDetail(root);
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
  });

  // Regression: a rejected save (network/serialization failure) used to leave
  // `isSaving` stuck true with no feedback. The catch must surface an error and
  // the editor must recover so the next edit still saves.
  it("recovers from a rejected save and saves again on the next edit", async () => {
    editMindmapMock.mockRejectedValueOnce(new Error("network down"));
    editMindmapMock.mockResolvedValueOnce({
      success: true,
      mindmapId: mindmap.id,
      subjectId: mindmap.subjectId,
    });

    await clickEditGraph(container);
    await flushAutosave();

    expect(editMindmapMock).toHaveBeenCalledTimes(1);
    expect(toastErrorMock).toHaveBeenCalledWith("Couldn't save the mindmap");

    await clickEditGraph(container);
    await flushAutosave();

    expect(editMindmapMock).toHaveBeenCalledTimes(2);
  });

  it("does not toast an error when the save succeeds", async () => {
    editMindmapMock.mockResolvedValue({
      success: true,
      mindmapId: mindmap.id,
      subjectId: mindmap.subjectId,
    });

    await clickEditGraph(container);
    await flushAutosave();

    expect(editMindmapMock).toHaveBeenCalledTimes(1);
    expect(toastErrorMock).not.toHaveBeenCalled();
  });
});
