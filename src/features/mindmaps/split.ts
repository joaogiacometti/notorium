import type { MindmapGraph } from "@/features/mindmaps/types";

const ROOT_NODE_ID = "root";

interface SplitMindmapGraphResult {
  title: string;
  remainingGraph: MindmapGraph;
  splitGraph: MindmapGraph;
}

/**
 * Split one branch and its descendants into a new root-led graph.
 *
 * @example
 * const { title, splitGraph } = splitMindmapGraph(graph, "node-1")!;
 */
export function splitMindmapGraph(
  graph: MindmapGraph,
  nodeId: string,
): SplitMindmapGraphResult | null {
  const selected = graph.nodes.find((node) => node.id === nodeId);
  if (!selected || selected.data.kind === "root") {
    return null;
  }

  const removed = collectGraphDescendants(graph, nodeId);
  const title = selected.data.label.trim() || "Untitled mindmap";
  return {
    title,
    remainingGraph: withoutSubtree(graph, removed),
    splitGraph: asRootedGraph(graph, selected, removed, title),
  };
}

function collectGraphDescendants(graph: MindmapGraph, nodeId: string) {
  const children = new Map<string, string[]>();
  for (const edge of graph.edges) {
    if (edge.cross) {
      continue;
    }
    children.set(edge.source, [
      ...(children.get(edge.source) ?? []),
      edge.target,
    ]);
  }

  const reached = new Set([nodeId]);
  const stack = [nodeId];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const child of current ? (children.get(current) ?? []) : []) {
      if (!reached.has(child)) {
        reached.add(child);
        stack.push(child);
      }
    }
  }
  return reached;
}

function withoutSubtree(
  graph: MindmapGraph,
  removed: Set<string>,
): MindmapGraph {
  return {
    nodes: graph.nodes.filter((node) => !removed.has(node.id)),
    edges: graph.edges.filter(
      (edge) => !removed.has(edge.source) && !removed.has(edge.target),
    ),
  };
}

function asRootedGraph(
  graph: MindmapGraph,
  selected: MindmapGraph["nodes"][number],
  included: Set<string>,
  title: string,
): MindmapGraph {
  const origin = selected.position;
  return {
    nodes: graph.nodes
      .filter((node) => included.has(node.id))
      .map((node) => ({
        ...node,
        id: node.id === selected.id ? ROOT_NODE_ID : node.id,
        position: {
          x: node.position.x - origin.x,
          y: node.position.y - origin.y,
        },
        data:
          node.id === selected.id
            ? { ...node.data, label: title, kind: "root" as const }
            : node.data,
      })),
    edges: graph.edges
      .filter((edge) => included.has(edge.source) && included.has(edge.target))
      .map((edge) => ({
        ...edge,
        source: edge.source === selected.id ? ROOT_NODE_ID : edge.source,
        target: edge.target === selected.id ? ROOT_NODE_ID : edge.target,
      })),
  };
}
