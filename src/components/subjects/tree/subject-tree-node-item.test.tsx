import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SubjectTreeNodeItem } from "@/components/subjects/tree/subject-tree-node-item";
import type { SubjectTreeNode } from "@/lib/server/api-contracts";

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

vi.mock("@/components/subjects/tree/subject-tree-actions-menu", () => ({
  SubjectActionsMenu: () => null,
}));

let container: HTMLDivElement;
let root: Root;

function buildFakeSubjectNode(
  overrides: Partial<SubjectTreeNode> = {},
): SubjectTreeNode {
  const timestamp = new Date("2026-01-01T00:00:00Z");
  return {
    id: "subject-1",
    name: "Biology",
    path: "Biology",
    parentSubjectId: null,
    userId: "user-1",
    createdAt: timestamp,
    updatedAt: timestamp,
    documentCount: 2,
    dueFlashcardCount: 0,
    children: [],
    ...overrides,
  };
}

function renderNode(node: SubjectTreeNode, onToggle: (id: string) => void) {
  const noop = () => {};
  act(() => {
    root.render(
      <SubjectTreeNodeItem
        node={node}
        depth={0}
        expandedIds={new Set()}
        activeHref="/"
        documentsBySubject={new Map()}
        documentActions={{}}
        draggedSubjectId={null}
        draggedDocumentId={null}
        dropTargetId={null}
        pendingMoveId={null}
        onToggle={onToggle}
        onRetryDocuments={noop}
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

function clickSubjectName(name: string) {
  const label = container.querySelector(`[title="${name}"]`);
  act(() => (label as HTMLElement | null)?.click());
}

describe("SubjectTreeNodeItem", () => {
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

  it("toggles an expandable subject when its name is clicked", () => {
    const onToggle = vi.fn();
    renderNode(buildFakeSubjectNode(), onToggle);

    clickSubjectName("Biology");

    expect(onToggle).toHaveBeenCalledWith("subject-1");
  });

  it("ignores name clicks on an empty subject", () => {
    const onToggle = vi.fn();
    renderNode(buildFakeSubjectNode({ documentCount: 0 }), onToggle);

    clickSubjectName("Biology");

    expect(onToggle).not.toHaveBeenCalled();
  });
});
