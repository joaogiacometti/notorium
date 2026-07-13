import type { Node } from "@xyflow/react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MindmapCanvasToolbar } from "@/components/mindmaps/mindmap-canvas-toolbar";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

const mocks = vi.hoisted(() => ({
  fitView: vi.fn(),
  getNodes: vi.fn(),
  setNodes: vi.fn(),
}));

vi.mock("@xyflow/react", () => ({
  useReactFlow: () => mocks,
}));

function node(id: string, label: string): Node {
  return { id, type: "mindmap", position: { x: 0, y: 0 }, data: { label } };
}

describe("MindmapCanvasToolbar", () => {
  let container: HTMLDivElement;
  let root: Root;
  const nodes = [node("first", "Mitochondria"), node("second", "Mitosis")];

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mocks.getNodes.mockReturnValue(nodes);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.clearAllMocks();
  });

  it("centers the first matching node and cycles matches with Enter", () => {
    act(() => {
      root.render(
        <MindmapCanvasToolbar
          nodes={nodes}
          searchInputRef={{ current: null }}
          canAddChild
          canUndo
          canRedo
          onAddChild={vi.fn()}
          onUndo={vi.fn()}
          onRedo={vi.fn()}
        />,
      );
    });

    const input = container.querySelector<HTMLInputElement>(
      "[aria-label='Search mindmap nodes']",
    );
    expect(input).not.toBeNull();

    act(() => {
      if (input) {
        const setInputValue = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )?.set;
        setInputValue?.call(input, "mit");
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });

    expect(mocks.fitView).toHaveBeenCalledWith({
      nodes: [{ id: "first" }],
      padding: 0.5,
      duration: 250,
    });

    act(() => {
      input?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      );
    });

    expect(mocks.fitView).toHaveBeenLastCalledWith({
      nodes: [{ id: "second" }],
      padding: 0.5,
      duration: 250,
    });
  });
});
