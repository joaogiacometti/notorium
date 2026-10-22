import type { Edge, Node } from "@xyflow/react";
import { toEdge, toRuntimeNodes } from "@/features/mindmaps/canvas-graph";
import { layoutMindmap } from "@/features/mindmaps/layout";
import type { MindmapGraph } from "@/features/mindmaps/types";

export type ReviewNodeSizes = ReadonlyMap<
  string,
  { width: number; height: number }
>;

/** Build a read-only graph overlay; the live canvas arrays and stored graph stay untouched.
 * Removed branches stay visible beside the proposal, so the overlay is re-laid out
 * with the review nodes' measured `sizes` to keep branches from overlapping.
 * @example const view = buildMindmapReviewGraph(original, proposed, "Title", sizes);
 */
export function buildMindmapReviewGraph(
  original: MindmapGraph,
  proposed: MindmapGraph,
  title: string,
  sizes: ReviewNodeSizes = new Map(),
): { nodes: Node[]; edges: Edge[] } {
  const nodes = [
    ...toRuntimeNodes(proposed.nodes, title).map((node) =>
      reviewNode(original, proposed, node),
    ),
    ...removedReviewNodes(original, proposed),
  ].map((node) => ({
    ...node,
    ...(sizes.has(node.id) ? { measured: sizes.get(node.id) } : {}),
    selected: false,
    draggable: false,
    selectable: false,
    focusable: false,
  }));
  return {
    nodes: layoutMindmap(nodes, reviewLayoutEdges(original, proposed)),
    edges: reviewEdges(original, proposed),
  };
}

function removedReviewNodes(
  original: MindmapGraph,
  proposed: MindmapGraph,
): Node[] {
  const remaining = new Set(proposed.nodes.map((node) => node.id));
  const rootLabel =
    original.nodes.find((entry) => entry.data.kind === "root")?.data.label ??
    "";
  return toRuntimeNodes(
    original.nodes.filter((entry) => !remaining.has(entry.id)),
    rootLabel,
  ).map((node) => ({
    ...node,
    type: "review",
    data: {
      ...node.data,
      reviewState: "removed",
      before: node.data.label,
      after: "",
    },
  }));
}

// Removed branches keep their old parent so they lay out beside the survivors.
function reviewLayoutEdges(
  original: MindmapGraph,
  proposed: MindmapGraph,
): Edge[] {
  const remaining = new Set(proposed.nodes.map((node) => node.id));
  return [
    ...proposed.edges,
    ...original.edges.filter((edge) => !remaining.has(edge.target)),
  ].map(toEdge);
}

function reviewNode(
  original: MindmapGraph,
  proposed: MindmapGraph,
  node: Node,
): Node {
  const before = original.nodes.find((entry) => entry.id === node.id);
  const state = reviewNodeState(original, proposed, node, before);
  if (!state) return node;
  return {
    ...node,
    type: "review",
    data: {
      ...node.data,
      reviewState: state,
      before: before?.data.label ?? "",
      after: node.data.label,
    },
  };
}

function reviewNodeState(
  original: MindmapGraph,
  proposed: MindmapGraph,
  node: Node,
  before: MindmapGraph["nodes"][number] | undefined,
): "added" | "changed" | "moved" | "styled" | null {
  if (!before) return "added";
  if (before.data.label !== node.data.label) return "changed";
  const parentOf = (graph: MindmapGraph) =>
    graph.edges.find((edge) => edge.target === node.id && !edge.cross)?.source;
  if (parentOf(original) !== parentOf(proposed)) return "moved";
  const styleOf = (data: Record<string, unknown>) =>
    JSON.stringify([data.color, data.bold === true, data.italic === true]);
  return styleOf(before.data) !== styleOf(node.data) ? "styled" : null;
}

function reviewEdges(original: MindmapGraph, proposed: MindmapGraph): Edge[] {
  const edges = proposed.edges.map((edge) => {
    const before = original.edges.find((entry) => entry.id === edge.id);
    return JSON.stringify(before) === JSON.stringify(edge)
      ? toEdge(edge)
      : markReviewEdge(toEdge(edge), "added");
  });
  for (const edge of original.edges) {
    const after = proposed.edges.find((entry) => entry.id === edge.id);
    if (JSON.stringify(edge) === JSON.stringify(after)) continue;
    const removed = toEdge({ ...edge, id: `review-removed-${edge.id}` });
    if (after?.source === edge.source && after.target === edge.target)
      removed.data = { ...removed.data, curveOffset: { x: 0, y: -60 } };
    edges.push(markReviewEdge(removed, "removed"));
  }
  return edges.map((edge) => ({
    ...edge,
    selectable: false,
    reconnectable: false,
    focusable: false,
  }));
}

function markReviewEdge(edge: Edge, state: "added" | "removed"): Edge {
  return {
    ...edge,
    type: "review",
    data: { ...edge.data, reviewState: state },
  };
}
