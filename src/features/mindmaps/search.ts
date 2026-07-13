import type { Node } from "@xyflow/react";

/**
 * Find text-bearing mindmap nodes whose labels contain the query.
 *
 * @example
 * findMindmapNodeIds(nodes, "mitosis");
 */
export function findMindmapNodeIds(nodes: Node[], query: string): string[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) {
    return [];
  }

  return nodes
    .filter((node) => {
      const label = node.data.label;
      return (
        typeof label === "string" &&
        label.toLocaleLowerCase().includes(normalizedQuery)
      );
    })
    .map((node) => node.id);
}
