import type { Node } from "@xyflow/react";
import { act, createElement, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import {
  getSiblingInsertY,
  useMindmapAddChild,
} from "@/lib/mindmap/use-mindmap-add-child";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

describe("getSiblingInsertY", () => {
  it("places the new sibling directly below the selected node", () => {
    const selected = {
      id: "second",
      position: { x: 0, y: 72 },
      data: { label: "Second" },
    } satisfies Node;

    expect(getSiblingInsertY(selected)).toBe(73);
  });
});

function AddChildHarness({
  selectedNode,
  onMutate,
  onReady,
}: Readonly<{
  selectedNode: Node;
  onMutate: () => void;
  onReady: (addChildToSelected: () => void) => void;
}>) {
  const actions = useMindmapAddChild({
    getNode: () => selectedNode,
    getNodes: () => [selectedNode],
    getEdges: () => [],
    setNodes: onMutate,
    setEdges: onMutate,
    takeSnapshot: onMutate,
    setPendingEditNodeId: onMutate,
  });
  useEffect(() => onReady(actions.addChildToSelected), [actions, onReady]);
  return null;
}

describe("useMindmapAddChild", () => {
  it("does not add a child to a selected image node", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    const onReady = vi.fn();
    const onMutate = vi.fn();
    document.body.appendChild(container);
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    const selectedNode = {
      id: "image-1",
      position: { x: 0, y: 0 },
      selected: true,
      data: { label: "", kind: "image" },
    } satisfies Node;

    try {
      await act(async () => {
        root.render(
          createElement(AddChildHarness, {
            selectedNode,
            onMutate,
            onReady,
          }),
        );
      });
      onReady.mock.lastCall?.[0]();
      expect(onMutate).not.toHaveBeenCalled();
    } finally {
      await act(async () => root.unmount());
      container.remove();
      (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT =
        false;
    }
  });
});
