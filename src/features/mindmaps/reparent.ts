import type { Edge } from "@xyflow/react";
import {
  collectDescendants,
  getSourceHandleSide,
  handlesForSide,
  isCrossEdge,
  type MindmapSide,
} from "@/features/mindmaps/sides";

/** The node's incoming tree edge (the one that defines its current parent). */
function incomingTreeEdge(edges: Edge[], nodeId: string): Edge | undefined {
  return edges.find((edge) => edge.target === nodeId && !isCrossEdge(edge));
}

/**
 * True when `nodeId` may be moved under `newParentId`. Rejects a move that would
 * detach the node or create a cycle: onto itself, onto its current parent
 * (no-op), onto one of its own descendants, or when the node has no tree parent
 * (the root, which must stay the tree's anchor).
 *
 * @example canReparent(edges, "cells", "chemistry")
 */
export function canReparent(
  edges: Edge[],
  nodeId: string,
  newParentId: string,
): boolean {
  if (nodeId === newParentId) {
    return false;
  }
  const parentEdge = incomingTreeEdge(edges, nodeId);
  if (!parentEdge || parentEdge.source === newParentId) {
    return false;
  }
  return !collectDescendants(edges, [nodeId]).has(newParentId);
}

/** Apply a new parent and side handles to one tree edge, preserving everything
 * else (id, label, direction, curve offset, cross flag). */
function withSide(edge: Edge, side: MindmapSide, source?: string): Edge {
  return { ...edge, ...(source ? { source } : {}), ...handlesForSide(side) };
}

/**
 * Re-parent `nodeId` (and its subtree) under `newParentId` on `newSide`. Returns
 * a new edge array: the node's incoming tree edge points at the new parent with
 * the side's handles, and—only when the branch side changes—every tree edge
 * inside the moved subtree is flipped to `newSide` so the whole branch fans out
 * consistently. Cross edges are left untouched. Callers should guard with
 * {@link canReparent} first.
 *
 * @example reparentNode(edges, "cells", "chemistry", "right")
 */
export function reparentNode(
  edges: Edge[],
  nodeId: string,
  newParentId: string,
  newSide: MindmapSide,
): Edge[] {
  const parentEdge = incomingTreeEdge(edges, nodeId);
  if (!parentEdge) {
    return edges;
  }
  const sideChanged = getSourceHandleSide(parentEdge.sourceHandle) !== newSide;
  const subtree = sideChanged ? collectDescendants(edges, [nodeId]) : null;
  return edges.map((edge) => {
    if (edge.id === parentEdge.id) {
      return withSide(edge, newSide, newParentId);
    }
    // Flip internal subtree edges (those leaving a moved node) onto the new side.
    if (subtree && !isCrossEdge(edge) && subtree.has(edge.source)) {
      return withSide(edge, newSide);
    }
    return edge;
  });
}
