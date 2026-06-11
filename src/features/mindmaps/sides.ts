import type { Edge, Node } from "@xyflow/react";

export type MindmapSide = "left" | "right";
export type MindmapAllowedSides = readonly MindmapSide[];

const BOTH_SIDES: MindmapAllowedSides = ["left", "right"];

/**
 * Reads the branch side encoded in a React Flow source handle.
 *
 * @example getSourceHandleSide("r-source")
 */
export function getSourceHandleSide(
  sourceHandle: string | null | undefined,
): MindmapSide | null {
  if (sourceHandle === "r-source") {
    return "right";
  }
  if (sourceHandle === "l-source") {
    return "left";
  }
  return null;
}

/**
 * The source/target handle pair a tree edge uses to branch to one side. Right
 * branches leave the parent's right and enter the child's left; left branches
 * mirror that. Single source of truth for the handle convention.
 *
 * @example handlesForSide("right") // { sourceHandle: "r-source", targetHandle: "l-target" }
 */
export function handlesForSide(side: MindmapSide): {
  sourceHandle: string;
  targetHandle: string;
} {
  return side === "right"
    ? { sourceHandle: "r-source", targetHandle: "l-target" }
    : { sourceHandle: "l-source", targetHandle: "r-target" };
}

/**
 * Collect `startIds` plus every node reachable from them via tree edges.
 * Cross-connections are skipped: following one (e.g. a link back to an ancestor)
 * would wrongly pull unrelated nodes into the subtree.
 *
 * @example collectDescendants(edges, ["branch-id"])
 */
export function collectDescendants(
  edges: Edge[],
  startIds: string[],
): Set<string> {
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    if (isCrossEdge(edge)) {
      continue;
    }
    const targets = adjacency.get(edge.source) ?? [];
    targets.push(edge.target);
    adjacency.set(edge.source, targets);
  }
  const reached = new Set(startIds);
  const stack = [...startIds];
  while (stack.length > 0) {
    const id = stack.pop();
    if (!id) {
      continue;
    }
    for (const target of adjacency.get(id) ?? []) {
      if (!reached.has(target)) {
        reached.add(target);
        stack.push(target);
      }
    }
  }
  return reached;
}

/**
 * True for cross-connection edges, which link arbitrary nodes without defining
 * the parent-child hierarchy. Tree walks must skip them: following one (e.g. a
 * connection back to an ancestor) creates a cycle.
 *
 * @example edges.filter((edge) => !isCrossEdge(edge))
 */
export function isCrossEdge(edge: Edge): boolean {
  return edge.data?.cross === true;
}

/**
 * Returns the side(s) where a node may add children.
 *
 * @example getNodeAllowedChildSides(nodes, edges, "branch-id")
 */
export function getNodeAllowedChildSides(
  nodes: Node[],
  edges: Edge[],
  nodeId: string,
): MindmapAllowedSides {
  // Cross-connections must not override a node's tree parent when tracing.
  const treeEdges = edges.filter((edge) => !isCrossEdge(edge));
  const root = findRootNode(nodes, treeEdges);
  if (!root || root.id === nodeId) {
    return BOTH_SIDES;
  }
  return traceRootBranchSide(treeEdges, root.id, nodeId) ?? BOTH_SIDES;
}

/**
 * Returns one side for keyboard-created children.
 *
 * @example getDefaultChildSide(["left", "right"])
 */
export function getDefaultChildSide(
  sides: MindmapAllowedSides,
): MindmapSide | null {
  if (sides.includes("right")) {
    return "right";
  }
  return sides[0] ?? null;
}

function findRootNode(nodes: Node[], edges: Edge[]): Node | undefined {
  const explicit = nodes.find((node) => node.data.kind === "root");
  if (explicit) {
    return explicit;
  }
  const hasParent = new Set(edges.map((edge) => edge.target));
  return nodes.find((node) => !hasParent.has(node.id));
}

function traceRootBranchSide(
  edges: Edge[],
  rootId: string,
  nodeId: string,
): MindmapAllowedSides | null {
  const parents = new Map(edges.map((edge) => [edge.target, edge]));
  const seen = new Set<string>();
  let currentId = nodeId;
  while (!seen.has(currentId)) {
    seen.add(currentId);
    const edge = parents.get(currentId);
    if (!edge) {
      return null;
    }
    const side = getSourceHandleSide(edge.sourceHandle);
    if (edge.source === rootId) {
      return side ? [side] : null;
    }
    currentId = edge.source;
  }
  return null;
}
