import type { Edge, Node, NodeChange } from "@xyflow/react";
import { getSourceHandleSide, isCrossEdge } from "@/features/mindmaps/sides";

// Vertical room reserved per leaf row and horizontal gap between depth columns.
export const ROW_STEP = 72;
export const CHILD_OFFSET_X = 210;
// Minimum vertical clearance between adjacent nodes; tall nodes (e.g. with
// images) reserve their measured height plus this gap instead of one ROW_STEP.
export const ROW_GAP = 24;
// Assumed height for nodes not yet measured by React Flow (fresh nodes render
// at roughly this height); keeps default rows exactly one ROW_STEP tall.
const FALLBACK_NODE_HEIGHT = ROW_STEP - ROW_GAP;

/** Rendered height of a node, falling back for nodes not yet measured. */
function nodeHeight(node: Node | undefined): number {
  return node?.measured?.height ?? node?.height ?? FALLBACK_NODE_HEIGHT;
}

/**
 * Record node heights from React Flow change events into `knownHeights` and
 * report whether any already-measured node changed height — the signal that
 * the layout must be recomputed (e.g. an image was added to a node, or its
 * image finished loading). First measurements (initial mount, fresh nodes)
 * only seed the map so saved layouts don't reflow on load.
 *
 * @example
 * if (trackNodeHeightChanges(changes, heightsRef.current)) relayout();
 */
export function trackNodeHeightChanges(
  changes: NodeChange[],
  knownHeights: Map<string, number>,
): boolean {
  let resized = false;
  for (const change of changes) {
    if (change.type === "remove") {
      knownHeights.delete(change.id);
      continue;
    }
    if (change.type !== "dimensions" || !change.dimensions) {
      continue;
    }
    const previous = knownHeights.get(change.id);
    knownHeights.set(change.id, change.dimensions.height);
    if (previous !== undefined && previous !== change.dimensions.height) {
      resized = true;
    }
  }
  return resized;
}

interface SideChildren {
  left: string[];
  right: string[];
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
    const side = getSourceHandleSide(edge.sourceHandle);
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
  // Cross-connections don't define hierarchy; following one (e.g. a connection
  // back to an ancestor) creates a cycle and the walk below never terminates.
  const treeEdges = edges.filter((edge) => !isCrossEdge(edge));
  const root = findRoot(nodes, treeEdges);
  if (!root) {
    return nodes;
  }
  const children = buildChildren(nodes, treeEdges);
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  // A node's own row must fit its rendered height (image nodes exceed ROW_STEP).
  const rowSpan = (id: string) =>
    Math.max(ROW_STEP, nodeHeight(nodeById.get(id)) + ROW_GAP);

  const spanCache = new Map<string, number>();
  // Tree edges can still cycle when the user reconnects an edge endpoint back
  // into its own subtree; a revisited node contributes no extra span instead
  // of recursing forever.
  const visiting = new Set<string>();
  const subtreeSpan = (id: string): number => {
    const cached = spanCache.get(id);
    if (cached !== undefined) {
      return cached;
    }
    if (visiting.has(id)) {
      return 0;
    }
    visiting.add(id);
    const entry = children.get(id);
    const sumSide = (ids: string[]) =>
      ids.reduce((total, child) => total + subtreeSpan(child), 0);
    const span = Math.max(
      rowSpan(id),
      entry ? sumSide(entry.left) : 0,
      entry ? sumSide(entry.right) : 0,
    );
    spanCache.set(id, span);
    return span;
  };

  const positions = new Map<string, { x: number; y: number }>();
  // `position` is the node's top-left, so convert the row center to a top edge;
  // with uniform fallback heights this matches the previous layout exactly.
  const assign = (id: string, x: number, centerY: number) => {
    // Already-positioned means a cycle led back here; stop instead of looping.
    if (positions.has(id)) {
      return;
    }
    positions.set(id, { x, y: centerY - nodeHeight(nodeById.get(id)) / 2 });
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

  // Anchor on the root's current center so its on-screen spot never moves.
  assign(
    root.id,
    root.position.x,
    root.position.y + nodeHeight(nodeById.get(root.id)) / 2,
  );

  return nodes.map((node) => {
    const next = positions.get(node.id);
    return next ? { ...node, position: next } : node;
  });
}
