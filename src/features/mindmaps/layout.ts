import type { Edge, Node } from "@xyflow/react";

// Vertical room reserved per leaf row and horizontal gap between depth columns.
export const ROW_STEP = 90;
export const CHILD_OFFSET_X = 260;

type Side = "left" | "right";

interface SideChildren {
  left: string[];
  right: string[];
}

function sideForHandle(sourceHandle: string | null | undefined): Side | null {
  if (sourceHandle === "r-source") {
    return "right";
  }
  if (sourceHandle === "l-source") {
    return "left";
  }
  return null;
}

/**
 * Group each node's children by the side they branch to, ordered top-to-bottom
 * by current `y` so the user's existing vertical arrangement is preserved.
 */
function buildChildren(
  nodes: Node[],
  edges: Edge[],
): Map<string, SideChildren> {
  const yOf = new Map(nodes.map((node) => [node.id, node.position.y]));
  const children = new Map<string, SideChildren>();
  for (const edge of edges) {
    const side = sideForHandle(edge.sourceHandle);
    if (!side) {
      continue;
    }
    const entry = children.get(edge.source) ?? { left: [], right: [] };
    entry[side].push(edge.target);
    children.set(edge.source, entry);
  }
  for (const entry of children.values()) {
    const byY = (a: string, b: string) => (yOf.get(a) ?? 0) - (yOf.get(b) ?? 0);
    entry.left.sort(byY);
    entry.right.sort(byY);
  }
  return children;
}

/** The node carrying the tree; falls back to the node with no incoming edge. */
function findRoot(nodes: Node[], edges: Edge[]): Node | undefined {
  const explicit = nodes.find((node) => node.data.kind === "root");
  if (explicit) {
    return explicit;
  }
  const hasParent = new Set(edges.map((edge) => edge.target));
  return nodes.find((node) => !hasParent.has(node.id));
}

/**
 * Recompute every node's position from the root so each parent stays vertically
 * centered on its children and no branches overlap. The root keeps its current
 * position as the anchor; children fan out left/right by depth. Pure: returns a
 * new node array, leaving inputs untouched.
 *
 * @example
 * const laidOut = layoutMindmap(nodes, edges);
 */
export function layoutMindmap(nodes: Node[], edges: Edge[]): Node[] {
  const root = findRoot(nodes, edges);
  if (!root) {
    return nodes;
  }
  const children = buildChildren(nodes, edges);

  const spanCache = new Map<string, number>();
  const subtreeSpan = (id: string): number => {
    const cached = spanCache.get(id);
    if (cached !== undefined) {
      return cached;
    }
    const entry = children.get(id);
    const sumSide = (ids: string[]) =>
      ids.reduce((total, child) => total + subtreeSpan(child), 0);
    const span = Math.max(
      ROW_STEP,
      entry ? sumSide(entry.left) : 0,
      entry ? sumSide(entry.right) : 0,
    );
    spanCache.set(id, span);
    return span;
  };

  const positions = new Map<string, { x: number; y: number }>();
  const assign = (id: string, x: number, centerY: number) => {
    positions.set(id, { x, y: centerY });
    const entry = children.get(id);
    if (!entry) {
      return;
    }
    for (const side of ["left", "right"] as const) {
      const ids = entry[side];
      const sideSpan = ids.reduce((t, c) => t + subtreeSpan(c), 0);
      const childX = x + (side === "right" ? CHILD_OFFSET_X : -CHILD_OFFSET_X);
      let cursor = centerY - sideSpan / 2;
      for (const childId of ids) {
        const childSpan = subtreeSpan(childId);
        assign(childId, childX, cursor + childSpan / 2);
        cursor += childSpan;
      }
    }
  };

  assign(root.id, root.position.x, root.position.y);

  return nodes.map((node) => {
    const next = positions.get(node.id);
    return next ? { ...node, position: next } : node;
  });
}
