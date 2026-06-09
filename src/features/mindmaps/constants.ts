/** Theme tokens a node may be tinted with. Stored on `node.data.color`. */
export const MINDMAP_NODE_COLOR_TOKENS = [
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
] as const;

export type MindmapNodeColor = (typeof MINDMAP_NODE_COLOR_TOKENS)[number];

/**
 * Arrowhead options for an edge. Stored on `edge.data.direction`. The order
 * also drives the inspector button row. `backward` points the arrow at the
 * edge's source node, `forward` at the target node.
 */
export const MINDMAP_EDGE_DIRECTIONS = [
  "none",
  "backward",
  "forward",
  "both",
] as const;

export type MindmapEdgeDirection = (typeof MINDMAP_EDGE_DIRECTIONS)[number];

export const DEFAULT_EDGE_DIRECTION: MindmapEdgeDirection = "forward";
