import type { Edge, EdgeMarker, Node } from "@xyflow/react";
import { MarkerType } from "@xyflow/react";
import {
  DEFAULT_EDGE_DIRECTION,
  MINDMAP_NODE_COLOR_TOKENS,
  type MindmapEdgeDirection,
  type MindmapNodeColor,
} from "@/features/mindmaps/constants";
import { handlesForSide, type MindmapSide } from "@/features/mindmaps/sides";
import type { MindmapGraph } from "@/features/mindmaps/types";

/**
 * Conversions between the persisted {@link MindmapGraph} JSON and the React Flow
 * `Node`/`Edge` runtime shapes. Kept pure and free of React so the canvas
 * component stays focused on interaction wiring and so these can be unit tested.
 */

const arrowMarker: EdgeMarker = {
  type: MarkerType.ArrowClosed,
  color: "var(--muted-foreground)",
};

/** Translate a stored direction into the start/end arrowheads React Flow draws. */
export function directionMarkers(direction: MindmapEdgeDirection): {
  markerStart?: EdgeMarker;
  markerEnd?: EdgeMarker;
} {
  return {
    markerStart:
      direction === "both" || direction === "backward"
        ? arrowMarker
        : undefined,
    markerEnd:
      direction === "both" || direction === "forward" ? arrowMarker : undefined,
  };
}

type PersistedEdge = Pick<
  MindmapGraph["edges"][number],
  "id" | "source" | "target"
> & {
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  direction?: MindmapEdgeDirection;
  curveOffset?: { x: number; y: number };
  cross?: boolean;
};

/** Build a React Flow edge from a persisted edge (or an ad-hoc new one). */
export function toEdge(edge: PersistedEdge): Edge {
  const direction = edge.direction ?? DEFAULT_EDGE_DIRECTION;
  const cross = edge.cross === true;
  return {
    id: edge.id,
    type: "mindmap",
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    // Tree edges cannot be deleted (would orphan nodes). Cross-connections are
    // safe to remove because they don't define the parent-child hierarchy.
    deletable: cross,
    label: edge.label,
    data: {
      direction,
      ...(cross ? { cross: true } : {}),
      ...(edge.curveOffset ? { curveOffset: edge.curveOffset } : {}),
    },
    ...directionMarkers(direction),
  };
}

/** A color value is only persisted when it is a known theme token. */
function asNodeColor(value: unknown): MindmapNodeColor | undefined {
  return MINDMAP_NODE_COLOR_TOKENS.includes(value as MindmapNodeColor)
    ? (value as MindmapNodeColor)
    : undefined;
}

/** Serialize the live React Flow nodes/edges back into the persisted graph. */
export function toGraph(nodes: Node[], edges: Edge[]): MindmapGraph {
  return {
    nodes: nodes.map((node) => {
      const color = asNodeColor(node.data.color);
      return {
        id: node.id,
        position: node.position,
        data: {
          label: typeof node.data.label === "string" ? node.data.label : "",
          ...(color ? { color } : {}),
          ...(node.data.bold === true ? { bold: true } : {}),
          ...(node.data.italic === true ? { italic: true } : {}),
          ...(node.data.kind === "root" ? { kind: "root" as const } : {}),
          ...(typeof node.data.imageUrl === "string"
            ? { imageUrl: node.data.imageUrl }
            : {}),
        },
      };
    }),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      ...(edge.sourceHandle ? { sourceHandle: edge.sourceHandle } : {}),
      ...(edge.targetHandle ? { targetHandle: edge.targetHandle } : {}),
      ...(typeof edge.label === "string" && edge.label.length > 0
        ? { label: edge.label }
        : {}),
      direction:
        (edge.data?.direction as MindmapEdgeDirection | undefined) ??
        DEFAULT_EDGE_DIRECTION,
      ...(edge.data?.curveOffset
        ? { curveOffset: edge.data.curveOffset as { x: number; y: number } }
        : {}),
      ...(edge.data?.cross === true ? { cross: true } : {}),
    })),
  };
}

/** A fresh tree edge linking `parentId` to `childId` on the given side. */
export function createChildEdge(
  parentId: string,
  childId: string,
  side: MindmapSide,
): Edge {
  return toEdge({
    id: crypto.randomUUID(),
    source: parentId,
    target: childId,
    ...handlesForSide(side),
  });
}

/** Deselect every existing node and append a new selected child of `parent`. */
export function selectOnlyNewChild(
  nodes: Node[],
  parent: Node,
  childId: string,
): Node[] {
  const child: Node = {
    id: childId,
    type: "mindmap",
    position: { x: parent.position.x, y: Number.MAX_SAFE_INTEGER },
    data: { label: "New idea" },
    selected: true,
  };
  return [...nodes.map((node) => ({ ...node, selected: false })), child];
}
