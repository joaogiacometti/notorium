"use client";

import type { Edge, Node } from "@xyflow/react";
import { type Dispatch, type SetStateAction, useCallback } from "react";
import {
  createChildEdge,
  selectOnlyNewChild,
} from "@/features/mindmaps/canvas-graph";
import { layoutMindmap } from "@/features/mindmaps/layout";
import {
  getBalancedRootChildSide,
  getDefaultChildSide,
  getNodeAllowedChildSides,
  type MindmapSide,
} from "@/features/mindmaps/sides";

/**
 * Position a new sibling just after the selected node in layout sort order.
 *
 * @example
 * const y = getSiblingInsertY(selectedNode);
 */
export function getSiblingInsertY(selected: Node): number {
  return selected.position.y + 1;
}

interface UseMindmapAddChildParams {
  getNode: (id: string) => Node | undefined;
  getNodes: () => Node[];
  getEdges: () => Edge[];
  setNodes: Dispatch<SetStateAction<Node[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  takeSnapshot: () => void;
  /** Mark the new node so it auto-enters edit mode on mount. */
  setPendingEditNodeId: (id: string | null) => void;
}

interface UseMindmapAddChild {
  addChild: (parentId: string, side: MindmapSide, childY?: number) => void;
  getAllowedChildSides: (nodeId: string) => readonly MindmapSide[];
  /** Tab: add a child to the single selected node on its default side. */
  addChildToSelected: () => void;
  /** Shift+Enter: add a sibling below the single selected node. */
  addSiblingToSelected: () => void;
}

/**
 * Child- and sibling-creation for the mindmap canvas, shared by the node `+`
 * affordances and the keyboard shortcuts. New children re-run the layout so the
 * branch stays evenly spaced and open straight into edit mode.
 *
 * @example
 * const { addChild, addChildToSelected } = useMindmapAddChild({ getNode, getNodes, getEdges, setNodes, setEdges, takeSnapshot, setPendingEditNodeId });
 */
export function useMindmapAddChild({
  getNode,
  getNodes,
  getEdges,
  setNodes,
  setEdges,
  takeSnapshot,
  setPendingEditNodeId,
}: UseMindmapAddChildParams): UseMindmapAddChild {
  const addChild = useCallback(
    (parentId: string, side: MindmapSide, childY?: number) => {
      const parent = getNode(parentId);
      if (!parent) {
        return;
      }
      const currentNodes = getNodes();
      const currentEdges = getEdges();
      const allowed = getNodeAllowedChildSides(
        currentNodes,
        currentEdges,
        parentId,
      );
      if (!allowed.includes(side)) {
        return;
      }
      const newNodeId = crypto.randomUUID();
      takeSnapshot();
      const nextEdges = currentEdges.concat(
        createChildEdge(parentId, newNodeId, side),
      );
      const nextNodes = selectOnlyNewChild(
        currentNodes,
        parent,
        newNodeId,
        childY,
      );
      setNodes(layoutMindmap(nextNodes, nextEdges));
      setEdges(nextEdges);
      setPendingEditNodeId(newNodeId);
    },
    [
      getNode,
      getNodes,
      getEdges,
      setNodes,
      setEdges,
      takeSnapshot,
      setPendingEditNodeId,
    ],
  );

  const getAllowedChildSides = useCallback(
    (nodeId: string) =>
      getNodeAllowedChildSides(getNodes(), getEdges(), nodeId),
    [getNodes, getEdges],
  );

  const addChildToSelected = useCallback(() => {
    const selectedNodes = getNodes().filter((node) => node.selected);
    if (selectedNodes.length !== 1) {
      return;
    }
    const selected = selectedNodes[0];
    const side =
      selected.data.kind === "root"
        ? getBalancedRootChildSide(getEdges(), selected.id)
        : getDefaultChildSide(getAllowedChildSides(selected.id));
    if (side) {
      addChild(selected.id, side);
    }
  }, [getNodes, getEdges, getAllowedChildSides, addChild]);

  const addSiblingToSelected = useCallback(() => {
    const selectedNodes = getNodes().filter((node) => node.selected);
    if (selectedNodes.length !== 1) {
      return;
    }
    const selected = selectedNodes[0];
    const nodeId = selected.id;
    const parentEdge = getEdges().find((edge) => edge.target === nodeId);
    if (!parentEdge) {
      return;
    }
    const side: MindmapSide =
      parentEdge.sourceHandle === "r-source" ? "right" : "left";
    addChild(parentEdge.source, side, getSiblingInsertY(selected));
  }, [getNodes, getEdges, addChild]);

  return {
    addChild,
    getAllowedChildSides,
    addChildToSelected,
    addSiblingToSelected,
  };
}
