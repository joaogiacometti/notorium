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
 * Returns the side(s) where a node may add children.
 *
 * @example getNodeAllowedChildSides(nodes, edges, "branch-id")
 */
export function getNodeAllowedChildSides(
  nodes: Node[],
  edges: Edge[],
  nodeId: string,
): MindmapAllowedSides {
  const root = findRootNode(nodes, edges);
  if (!root || root.id === nodeId) {
    return BOTH_SIDES;
  }
  return traceRootBranchSide(edges, root.id, nodeId) ?? BOTH_SIDES;
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
