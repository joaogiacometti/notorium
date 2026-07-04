import type { ReactNode } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MindmapCanvas } from "@/components/mindmaps/mindmap-canvas";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

vi.mock("@xyflow/react", () => ({
  addEdge: vi.fn(),
  Background: ({ id }: { id?: string }) => <div data-background-id={id} />,
  Controls: () => null,
  MarkerType: { ArrowClosed: "arrowclosed" },
  Panel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ReactFlow: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ReactFlowProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  reconnectEdge: vi.fn(),
  SelectionMode: { Partial: "partial" },
  useEdgesState: (initial: unknown[]) => [initial, vi.fn(), vi.fn()],
  useNodesState: (initial: unknown[]) => [initial, vi.fn(), vi.fn()],
  useReactFlow: () => ({
    getNode: vi.fn(),
    getNodes: () => [],
    getEdges: () => [],
    getIntersectingNodes: () => [],
    screenToFlowPosition: (point: { x: number; y: number }) => point,
  }),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light" }),
}));

vi.mock("@/components/mindmaps/mindmap-actions-context", () => ({
  MindmapActionsProvider: ({ children }: { children: ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("@/components/mindmaps/mindmap-edge", () => ({
  MindmapEdge: () => null,
}));
vi.mock("@/components/mindmaps/mindmap-image-node", () => ({
  MindmapImageNode: () => null,
}));
vi.mock("@/components/mindmaps/mindmap-mode-toolbar", () => ({
  MindmapModeToolbar: () => null,
}));
vi.mock("@/components/mindmaps/mindmap-node", () => ({
  MindmapNodeComponent: () => null,
}));
vi.mock("@/components/mindmaps/mindmap-root-node", () => ({
  MindmapRootNode: () => null,
}));
vi.mock("@/components/mindmaps/use-mindmap-canvas-actions", () => ({
  useMindmapCanvasActions: () => ({}),
}));
vi.mock("@/components/mindmaps/use-mindmap-png-export", () => ({
  useMindmapPngExport: vi.fn(),
}));
vi.mock("@/lib/mindmap/use-mindmap-add-child", () => ({
  useMindmapAddChild: () => ({
    addChild: vi.fn(),
    getAllowedChildSides: () => [],
    addChildToSelected: vi.fn(),
    addSiblingToSelected: vi.fn(),
  }),
}));
vi.mock("@/lib/mindmap/use-mindmap-history", () => ({
  useMindmapHistory: () => ({
    takeSnapshot: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
  }),
}));
vi.mock("@/lib/mindmap/use-mindmap-image-paste", () => ({
  useMindmapImagePaste: vi.fn(),
}));
vi.mock("@/lib/mindmap/use-mindmap-reparent-drag", () => ({
  useMindmapReparentDrag: () => ({
    onNodesChangeWithRelayout: vi.fn(),
    onNodeDragStart: vi.fn(),
    onNodeDrag: vi.fn(),
    onNodeDragStop: vi.fn(),
  }),
}));
vi.mock("@/lib/mindmap/use-mindmap-shortcuts", () => ({
  useMindmapShortcuts: vi.fn(),
}));

describe("MindmapCanvas", () => {
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

  it("uses a unique React Flow background id per canvas", () => {
    const graph = { nodes: [], edges: [] };

    act(() => {
      root.render(
        <>
          <MindmapCanvas
            initialGraph={graph}
            title="One"
            onTitleChange={vi.fn()}
            onGraphChange={vi.fn()}
          />
          <MindmapCanvas
            initialGraph={graph}
            title="Two"
            onTitleChange={vi.fn()}
            onGraphChange={vi.fn()}
          />
        </>,
      );
    });

    const ids = Array.from(
      container.querySelectorAll("[data-background-id]"),
    ).map((node) => node.getAttribute("data-background-id"));

    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });
});
