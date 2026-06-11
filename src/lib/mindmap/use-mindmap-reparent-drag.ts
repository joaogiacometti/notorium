"use client";

import type { Edge, Node, NodeChange } from "@xyflow/react";
import { type Dispatch, type SetStateAction, useCallback, useRef } from "react";
import {
  layoutMindmap,
  trackNodeHeightChanges,
} from "@/features/mindmaps/layout";
import { canReparent, reparentNode } from "@/features/mindmaps/reparent";
import {
  getDefaultChildSide,
  getNodeAllowedChildSides,
  type MindmapSide,
} from "@/features/mindmaps/sides";

interface UseMindmapReparentDragParams {
  getNodes: () => Node[];
  getEdges: () => Edge[];
  getIntersectingNodes: (node: Node) => Node[];
  setNodes: Dispatch<SetStateAction<Node[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  /** React Flow's base node-change applier (from `useNodesState`). */
  onNodesChange: (changes: NodeChange[]) => void;
  /** Push an undo snapshot before a drag begins. */
  takeSnapshot: () => void;
}

interface UseMindmapReparentDrag {
  onNodesChangeWithRelayout: (changes: NodeChange[]) => void;
  onNodeDragStart: () => void;
  onNodeDrag: (event: MouseEvent | TouchEvent, node: Node) => void;
  onNodeDragStop: (event: MouseEvent | TouchEvent, node: Node) => void;
}

/**
 * Drag-to-reparent for the mindmap canvas, plus the height-driven relayout that
 * keeps rows clear when a node grows. Highlights the legal drop target while
 * dragging and, on drop, moves the node's subtree under it and re-lays out.
 *
 * @example
 * const drag = useMindmapReparentDrag({ getNodes, getEdges, getIntersectingNodes, setNodes, setEdges, onNodesChange, takeSnapshot });
 * <ReactFlow onNodeDragStop={drag.onNodeDragStop} ... />
 */
export function useMindmapReparentDrag({
  getNodes,
  getEdges,
  getIntersectingNodes,
  setNodes,
  setEdges,
  onNodesChange,
  takeSnapshot,
}: UseMindmapReparentDragParams): UseMindmapReparentDrag {
  // Re-run the layout when an already-rendered node changes height (image
  // added/removed or finished loading) so nodes below it are pushed clear.
  const knownNodeHeightsRef = useRef(new Map<string, number>());
  // After a reparent, React Flow fires a drag-end position change (dragging:
  // false) that arrives after setNodes(layoutMindmap(…)) is already queued.
  // In React 18's batched flush the position delta wins if it lands last,
  // moving the node back to the raw drop position instead of its layout slot.
  // We store the reparented node id here and skip exactly that one change so
  // the layout result is never overridden.
  const reparentedNodeIdRef = useRef<string | null>(null);

  const onNodesChangeWithRelayout = useCallback(
    (changes: NodeChange[]) => {
      const pendingId = reparentedNodeIdRef.current;
      const filtered = pendingId
        ? changes.filter(
            (c) =>
              !(c.type === "position" && !c.dragging && c.id === pendingId),
          )
        : changes;
      if (filtered.length !== changes.length) {
        reparentedNodeIdRef.current = null;
      }
      onNodesChange(filtered);
      if (trackNodeHeightChanges(filtered, knownNodeHeightsRef.current)) {
        setNodes((current) => layoutMindmap(current, getEdges()));
      }
    },
    [onNodesChange, setNodes, getEdges],
  );

  // The node under a single dragged node that it can legally re-parent onto, or
  // null. Multi-node drags only reposition, so re-parenting is skipped for them.
  const findReparentTarget = useCallback(
    (dragged: Node): Node | null => {
      if (getNodes().filter((node) => node.selected).length > 1) {
        return null;
      }
      const edges = getEdges();
      for (const candidate of getIntersectingNodes(dragged)) {
        if (canReparent(edges, dragged.id, candidate.id)) {
          return candidate;
        }
      }
      return null;
    },
    [getNodes, getEdges, getIntersectingNodes],
  );

  // Pick which side of the new parent the moved branch attaches to: the drop
  // side for the root (which allows both), otherwise the parent's single branch.
  const chooseReparentSide = useCallback(
    (dragged: Node, target: Node): MindmapSide => {
      if (target.data.kind === "root") {
        return dragged.position.x >= target.position.x ? "right" : "left";
      }
      const allowed = getNodeAllowedChildSides(
        getNodes(),
        getEdges(),
        target.id,
      );
      return getDefaultChildSide(allowed) ?? "right";
    },
    [getNodes, getEdges],
  );

  // Flag at most one node as the live drop target so it can highlight; a no-op
  // when nothing changes so dragging does not thrash React state.
  const setDropTarget = useCallback(
    (targetId: string | null) => {
      setNodes((current) => {
        let changed = false;
        const next = current.map((node) => {
          const flag = node.id === targetId;
          if ((node.data.dropTarget === true) === flag) {
            return node;
          }
          changed = true;
          return { ...node, data: { ...node.data, dropTarget: flag } };
        });
        return changed ? next : current;
      });
    },
    [setNodes],
  );

  // Snapshot for undo, and clear any stale reparent guard so a missed drag-end
  // change from a previous reparent can never swallow this drag's updates.
  const onNodeDragStart = useCallback(() => {
    reparentedNodeIdRef.current = null;
    takeSnapshot();
  }, [takeSnapshot]);

  const onNodeDrag = useCallback(
    (_event: MouseEvent | TouchEvent, node: Node) => {
      setDropTarget(findReparentTarget(node)?.id ?? null);
    },
    [findReparentTarget, setDropTarget],
  );

  const onNodeDragStop = useCallback(
    (_event: MouseEvent | TouchEvent, node: Node) => {
      const target = findReparentTarget(node);
      setDropTarget(null);
      if (!target) {
        return;
      }
      // The pre-drag snapshot from onNodeDragStart already covers this move.
      const side = chooseReparentSide(node, target);
      const nextEdges = reparentNode(getEdges(), node.id, target.id, side);
      // Use the `node` parameter (accurate drop position from React Flow's
      // internal drag tracking) rather than getNodes() for the dragged node,
      // so the layout sorts siblings by the actual drop Y and not stale state.
      const selectedNodes = getNodes().map((current) =>
        current.id === node.id
          ? { ...node, selected: true }
          : { ...current, selected: false },
      );
      reparentedNodeIdRef.current = node.id;
      setEdges(nextEdges);
      setNodes(layoutMindmap(selectedNodes, nextEdges));
    },
    [
      findReparentTarget,
      setDropTarget,
      chooseReparentSide,
      getEdges,
      getNodes,
      setEdges,
      setNodes,
    ],
  );

  return {
    onNodesChangeWithRelayout,
    onNodeDragStart,
    onNodeDrag,
    onNodeDragStop,
  };
}
