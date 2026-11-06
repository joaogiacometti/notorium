import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FolderTreeNodeItem } from "@/components/folders/tree/folder-tree-node-item";
import type { FolderTreeNode } from "@/lib/server/api-contracts";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("@/components/folders/tree/folder-tree-actions-menu", () => ({
  FolderActionsMenu: () => null,
}));

let container: HTMLDivElement;
let root: Root;

function buildFakeFolderNode(
  overrides: Partial<FolderTreeNode> = {},
): FolderTreeNode {
  const timestamp = new Date("2026-01-01T00:00:00Z");
  return {
    id: "folder-1",
    name: "Biology",
    path: "Biology",
    parentFolderId: null,
    userId: "user-1",
    createdAt: timestamp,
    updatedAt: timestamp,
    documentCount: 2,
    dueFlashcardCount: 0,
    children: [],
    ...overrides,
  };
}

function renderNode(node: FolderTreeNode, onToggle: (id: string) => void) {
  const noop = () => {};
  act(() => {
    root.render(
      <FolderTreeNodeItem
        node={node}
        depth={0}
        expandedIds={new Set()}
        activeHref="/"
        documentActions={{}}
        draggedFolderId={null}
        draggedDocumentId={null}
        dropTargetId={null}
        pendingMoveId={null}
        onToggle={onToggle}
        onCreateChild={noop}
        onCreateNote={noop}
        onCreatePdf={noop}
        onCreateFlashcard={noop}
        onEdit={noop}
        onDelete={noop}
        onDragStart={noop}
        onDocumentDragStart={noop}
        onDragTarget={noop}
        onDropTarget={noop}
        onDragEnd={noop}
      />,
    );
  });
}

function clickFolderName(name: string) {
  const label = container.querySelector(`[title="${name}"]`);
  act(() => (label as HTMLElement | null)?.click());
}

describe("FolderTreeNodeItem", () => {
  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("toggles an expandable folder when its name is clicked", () => {
    const onToggle = vi.fn();
    renderNode(buildFakeFolderNode(), onToggle);

    clickFolderName("Biology");

    expect(onToggle).toHaveBeenCalledWith("folder-1");
  });

  it("ignores name clicks on an empty folder", () => {
    const onToggle = vi.fn();
    renderNode(buildFakeFolderNode({ documentCount: 0 }), onToggle);

    clickFolderName("Biology");

    expect(onToggle).not.toHaveBeenCalled();
  });
});
