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
  getSourceHandleSide,
  isCrossEdge,
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

interface ReparentDrop {
  highlightId: string;
  parentId: string;
  side: MindmapSide;
}

const SIBLING_DROP_GAP = 40;

function nodeCenterX(node: Node): number {
  return node.position.x + (node.measured?.width ?? node.width ?? 0) / 2;
}

function nodeHeight(node: Node): number {
  return node.measured?.height ?? node.height ?? 0;
}

function nodeWidth(node: Node): number {
  return node.measured?.width ?? node.width ?? 0;
}

function overlapsHorizontally(a: Node, b: Node): boolean {
  return (
    a.position.x < b.position.x + nodeWidth(b) &&
    a.position.x + nodeWidth(a) > b.position.x
  );
}

function isSiblingDropNear(dragged: Node, target: Node): boolean {
  if (target.data.kind === "root" || !overlapsHorizontally(dragged, target)) {
    return false;
  }
  const draggedTop = dragged.position.y;
  const draggedBottom = dragged.position.y + nodeHeight(dragged);
  const targetTop = target.position.y;
  const targetBottom = target.position.y + nodeHeight(target);
  return (
    Math.abs(draggedBottom - targetTop) <= SIBLING_DROP_GAP ||
    Math.abs(draggedTop - targetBottom) <= SIBLING_DROP_GAP
  );
}

function siblingDropTarget(
  dragged: Node,
  target: Node,
  edges: Edge[],
): ReparentDrop | null {
  if (!isSiblingDropNear(dragged, target)) {
    return null;
  }
  const parentEdge = edges.find(
    (edge) => edge.target === target.id && !isCrossEdge(edge),
  );
  const side = getSourceHandleSide(parentEdge?.sourceHandle);
  return parentEdge && side
    ? { highlightId: target.id, parentId: parentEdge.source, side }
    : null;
}

function withoutDropTarget(node: Node): Node {
  if (node.data.dropTarget !== true) {
    return node;
  }
  return { ...node, data: { ...node.data, dropTarget: false } };
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
  // After a layout snap, React Flow fires a drag-end position change (dragging:
  // false) that arrives after setNodes(layoutMindmap(...)) is already queued.
  // In React 18's batched flush the position delta wins if it lands last,
  // moving the node back to the raw drop position instead of its layout slot.
  // We store the snapped node id here and skip exactly that one change so
  // the layout result is never overridden.
  const layoutLockedNodeIdRef = useRef<string | null>(null);

  const onNodesChangeWithRelayout = useCallback(
    (changes: NodeChange[]) => {
      const pendingId = layoutLockedNodeIdRef.current;
      const filtered = pendingId
        ? changes.filter(
            (c) =>
              !(c.type === "position" && !c.dragging && c.id === pendingId),
          )
        : changes;
      if (filtered.length !== changes.length) {
        layoutLockedNodeIdRef.current = null;
      }
      onNodesChange(filtered);
      if (trackNodeHeightChanges(filtered, knownNodeHeightsRef.current)) {
        setNodes((current) => layoutMindmap(current, getEdges()));
      }
    },
    [onNodesChange, setNodes, getEdges],
  );

  // Pick which side of the new parent the moved branch attaches to: the drop
  // side for the root (which allows both), otherwise the parent's single branch.
  const chooseReparentSide = useCallback(
    (dragged: Node, target: Node): MindmapSide => {
      if (target.data.kind === "root") {
        return nodeCenterX(dragged) >= nodeCenterX(target) ? "right" : "left";
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

  // The node under a single dragged node that it can legally re-parent onto, or
  // null. Multi-node drags only reposition, so re-parenting is skipped for them.
  const findReparentTarget = useCallback(
    (dragged: Node): ReparentDrop | null => {
      if (getNodes().filter((node) => node.selected).length > 1) {
        return null;
      }
      const edges = getEdges();
      for (const candidate of getIntersectingNodes(dragged)) {
        // Standalone image nodes are not part of the tree; never reparent onto
        // one (and an image being dragged has no tree parent to move).
        if (candidate.data.kind === "image") {
          continue;
        }
        const side = chooseReparentSide(dragged, candidate);
        if (canReparent(edges, dragged.id, candidate.id, side)) {
          return { highlightId: candidate.id, parentId: candidate.id, side };
        }
      }
      for (const candidate of getNodes()) {
        if (candidate.id === dragged.id || candidate.data.kind === "image") {
          continue;
        }
        const sibling = siblingDropTarget(dragged, candidate, edges);
        if (
          sibling &&
          canReparent(edges, dragged.id, sibling.parentId, sibling.side)
        ) {
          return sibling;
        }
      }
      return null;
    },
    [getNodes, getEdges, getIntersectingNodes, chooseReparentSide],
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

  // Snapshot for undo, and clear any stale layout guard so a missed drag-end
  // change from a previous snap can never swallow this drag's updates.
  const onNodeDragStart = useCallback(() => {
    layoutLockedNodeIdRef.current = null;
    takeSnapshot();
  }, [takeSnapshot]);

  const onNodeDrag = useCallback(
    (_event: MouseEvent | TouchEvent, node: Node) => {
      setDropTarget(findReparentTarget(node)?.highlightId ?? null);
    },
    [findReparentTarget, setDropTarget],
  );

  const onNodeDragStop = useCallback(
    (_event: MouseEvent | TouchEvent, node: Node) => {
      const target = findReparentTarget(node);
      setDropTarget(null);
      if (!target) {
        if (
          node.data.kind !== "image" &&
          getNodes().filter((current) => current.selected).length <= 1
        ) {
          layoutLockedNodeIdRef.current = node.id;
          setNodes(
            layoutMindmap(
              getNodes().map((current) =>
                current.id === node.id
                  ? withoutDropTarget({ ...node, selected: true })
                  : withoutDropTarget(current),
              ),
              getEdges(),
            ),
          );
        }
        return;
      }
      // The pre-drag snapshot from onNodeDragStart already covers this move.
      const nextEdges = reparentNode(
        getEdges(),
        node.id,
        target.parentId,
        target.side,
      );
      // Use the `node` parameter (accurate drop position from React Flow's
      // internal drag tracking) rather than getNodes() for the dragged node,
      // so the layout sorts siblings by the actual drop Y and not stale state.
      const selectedNodes = getNodes().map((current) =>
        current.id === node.id
          ? withoutDropTarget({ ...node, selected: true })
          : withoutDropTarget({ ...current, selected: false }),
      );
      layoutLockedNodeIdRef.current = node.id;
      setEdges(nextEdges);
      setNodes(layoutMindmap(selectedNodes, nextEdges));
    },
    [findReparentTarget, setDropTarget, getEdges, getNodes, setEdges, setNodes],
  );

  return {
    onNodesChangeWithRelayout,
    onNodeDragStart,
    onNodeDrag,
    onNodeDragStop,
  };
}
