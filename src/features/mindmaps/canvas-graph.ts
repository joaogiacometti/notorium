import type { Edge, EdgeMarker, Node } from "@xyflow/react";
import { MarkerType } from "@xyflow/react";
import {
  DEFAULT_EDGE_DIRECTION,
  MINDMAP_IMAGE_DEFAULT_SIZE,
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

/** Build the React Flow runtime node for one persisted node. The root's label is
 * driven by the live mindmap title and it is made permanent; image nodes restore
 * their persisted size (falling back to the default) and stay outside the tree. */
function toRuntimeNode(
  node: MindmapGraph["nodes"][number],
  title: string,
): Node {
  if (node.data.kind === "image") {
    return {
      id: node.id,
      type: "image",
      position: node.position,
      width: node.data.width ?? MINDMAP_IMAGE_DEFAULT_SIZE,
      height: node.data.height ?? MINDMAP_IMAGE_DEFAULT_SIZE,
      data: { ...node.data },
    };
  }
  const isRoot = node.data.kind === "root";
  return {
    id: node.id,
    type: isRoot ? "root" : "mindmap",
    position: node.position,
    data: isRoot ? { ...node.data, label: title } : { ...node.data },
    ...(isRoot ? { deletable: false } : {}),
  };
}

/** Map a persisted graph's nodes into React Flow runtime nodes. */
export function toRuntimeNodes(
  nodes: MindmapGraph["nodes"],
  title: string,
): Node[] {
  return nodes.map((node) => toRuntimeNode(node, title));
}

/** A color value is only persisted when it is a known theme token. */
function asNodeColor(value: unknown): MindmapNodeColor | undefined {
  return MINDMAP_NODE_COLOR_TOKENS.includes(value as MindmapNodeColor)
    ? (value as MindmapNodeColor)
    : undefined;
}

/** Positive measured size of a node, falling back to its requested size. */
function persistedSize(
  measured: unknown,
  requested: unknown,
): number | undefined {
  const value = typeof measured === "number" ? measured : requested;
  return typeof value === "number" && value > 0 ? value : undefined;
}

/** The resized dimensions of an image node, preferring React Flow's measured
 * size (what `NodeResizer` writes) over the originally requested size. */
function imageNodeSize(node: Node): { width?: number; height?: number } {
  const width = persistedSize(node.measured?.width, node.width);
  const height = persistedSize(node.measured?.height, node.height);
  return {
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
  };
}

/** Serialize the live React Flow nodes/edges back into the persisted graph.
 * Transient image nodes that are still uploading (no `imageUrl` yet) are
 * dropped so a debounce-autosave mid-upload never persists a broken node. */
export function toGraph(nodes: Node[], edges: Edge[]): MindmapGraph {
  return {
    nodes: nodes
      .filter(
        (node) => !(node.data.kind === "image" && node.data.uploading === true),
      )
      .map((node) => {
        const color = asNodeColor(node.data.color);
        const isImage = node.data.kind === "image";
        return {
          id: node.id,
          position: node.position,
          data: {
            label: typeof node.data.label === "string" ? node.data.label : "",
            ...(color ? { color } : {}),
            ...(node.data.bold === true ? { bold: true } : {}),
            ...(node.data.italic === true ? { italic: true } : {}),
            ...(node.data.kind === "root" ? { kind: "root" as const } : {}),
            ...(isImage
              ? { kind: "image" as const, ...imageNodeSize(node) }
              : {}),
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

/**
 * Deselect every existing node and append a new selected child of `parent`.
 *
 * @example
 * const nodes = selectOnlyNewChild(
 *   currentNodes,
 *   parent,
 *   "child-1",
 *   parent.position.y + 1,
 * );
 */
export function selectOnlyNewChild(
  nodes: Node[],
  parent: Node,
  childId: string,
  childY = Number.MAX_SAFE_INTEGER,
): Node[] {
  const child: Node = {
    id: childId,
    type: "mindmap",
    position: { x: parent.position.x, y: childY },
    data: { label: "New idea" },
    selected: true,
  };
  return [...nodes.map((node) => ({ ...node, selected: false })), child];
}
