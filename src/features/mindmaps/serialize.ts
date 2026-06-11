import type { Edge, Node } from "@xyflow/react";
import { isCrossEdge } from "@/features/mindmaps/sides";

/** A tree child plus the optional label on the edge that reaches it. */
interface TreeChild {
  id: string;
  edgeLabel?: string;
}

const INDENT = "  ";

/** Parent id -> ordered tree children. Cross-connections are excluded so the
 * walk follows only the parent-child hierarchy. */
function buildChildren(edges: Edge[]): Map<string, TreeChild[]> {
  const children = new Map<string, TreeChild[]>();
  for (const edge of edges) {
    if (isCrossEdge(edge)) {
      continue;
    }
    const list = children.get(edge.source) ?? [];
    const label = typeof edge.label === "string" ? edge.label.trim() : "";
    list.push({
      id: edge.target,
      edgeLabel: label.length > 0 ? label : undefined,
    });
    children.set(edge.source, list);
  }
  return children;
}

/** Child id -> tree parent id (cross-connections excluded). */
function buildParents(edges: Edge[]): Map<string, string> {
  const parents = new Map<string, string>();
  for (const edge of edges) {
    if (!isCrossEdge(edge)) {
      parents.set(edge.target, edge.source);
    }
  }
  return parents;
}

/** Trimmed node label, falling back to "Untitled" so blank nodes stay readable. */
function nodeLabel(node: Node | undefined): string {
  const label = node?.data?.label;
  const text = typeof label === "string" ? label.trim() : "";
  return text.length > 0 ? text : "Untitled";
}

/** True when a tree ancestor of `id` is also selected, so `id` will be rendered
 * nested under that ancestor instead of as its own top-level branch. */
function hasSelectedAncestor(
  id: string,
  selected: Set<string>,
  parents: Map<string, string>,
): boolean {
  // Seed with the start node so a cyclic edge that loops back to it terminates
  // without treating the node as its own ancestor.
  const seen = new Set<string>([id]);
  let current = parents.get(id);
  while (current && !seen.has(current)) {
    if (selected.has(current)) {
      return true;
    }
    seen.add(current);
    current = parents.get(current);
  }
  return false;
}

/** Depth-first walk that appends one indented bullet per node, prefixing a
 * child with its edge label (`relation → child`) when the edge is labelled.
 * `visited` guards against cycles introduced by reconnected edges. */
function appendSubtree(
  id: string,
  depth: number,
  lines: string[],
  visited: Set<string>,
  nodeById: Map<string, Node>,
  children: Map<string, TreeChild[]>,
  edgeLabel?: string,
): void {
  if (visited.has(id)) {
    return;
  }
  visited.add(id);
  const prefix = edgeLabel ? `${edgeLabel} → ` : "";
  lines.push(
    `${INDENT.repeat(depth)}- ${prefix}${nodeLabel(nodeById.get(id))}`,
  );
  for (const child of children.get(id) ?? []) {
    appendSubtree(
      child.id,
      depth + 1,
      lines,
      visited,
      nodeById,
      children,
      child.edgeLabel,
    );
  }
}

/**
 * Serializes the selected nodes and their subtrees into a nested markdown
 * outline suitable for pasting into an AI chat. Each selected node is rendered
 * with every tree descendant indented beneath it; a node that is already a
 * descendant of another selected node is not repeated as a top-level branch.
 *
 * @example
 * serializeMindmapSelection(nodes, edges, ["root"]);
 * // "- Biology\n  - Cells\n    - Mitochondria"
 */
export function serializeMindmapSelection(
  nodes: Node[],
  edges: Edge[],
  selectedIds: string[],
): string {
  const selected = new Set(selectedIds);
  if (selected.size === 0) {
    return "";
  }
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const children = buildChildren(edges);
  const parents = buildParents(edges);
  const lines: string[] = [];
  const visited = new Set<string>();
  // Walk nodes in their own order so the outline is stable and matches the map.
  for (const node of nodes) {
    if (
      selected.has(node.id) &&
      !hasSelectedAncestor(node.id, selected, parents)
    ) {
      appendSubtree(node.id, 0, lines, visited, nodeById, children);
    }
  }
  return lines.join("\n");
}
