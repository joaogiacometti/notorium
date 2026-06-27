"use client";

import type { Edge, Node } from "@xyflow/react";
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useMemo,
} from "react";
import type { MindmapActions } from "@/components/mindmaps/mindmap-actions-context";
import { directionMarkers } from "@/features/mindmaps/canvas-graph";
import {
  DEFAULT_EDGE_DIRECTION,
  type MindmapEdgeDirection,
} from "@/features/mindmaps/constants";
import type { MindmapSide } from "@/features/mindmaps/sides";

/** Merge `patch` into the `data` of every node whose id is in `ids`. */
function patchNodesData(
  nodes: Node[],
  ids: Set<string>,
  patch: Record<string, unknown>,
): Node[] {
  return nodes.map((node) =>
    ids.has(node.id) ? { ...node, data: { ...node.data, ...patch } } : node,
  );
}

/** Apply a label/direction patch to one edge, refreshing its arrow markers. */
function patchEdgeDirection(
  edges: Edge[],
  edgeId: string,
  patch: { label?: string; direction?: MindmapEdgeDirection },
): Edge[] {
  return edges.map((edge) => {
    if (edge.id !== edgeId) {
      return edge;
    }
    const direction =
      patch.direction ??
      (edge.data?.direction as MindmapEdgeDirection | undefined) ??
      DEFAULT_EDGE_DIRECTION;
    return {
      ...edge,
      label: patch.label ?? edge.label,
      data: { ...edge.data, direction },
      ...directionMarkers(direction),
    };
  });
}

/** Store a curve bend offset on one edge. */
function patchEdgeCurveOffset(
  edges: Edge[],
  edgeId: string,
  offset: { x: number; y: number },
): Edge[] {
  return edges.map((edge) =>
    edge.id === edgeId
      ? { ...edge, data: { ...edge.data, curveOffset: offset } }
      : edge,
  );
}

interface UseMindmapCanvasActionsParams {
  getNode: (id: string) => Node | undefined;
  getNodes: () => Node[];
  setNodes: Dispatch<SetStateAction<Node[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  takeSnapshot: () => void;
  removeSubtrees: (startIds: string[]) => void;
  deleteSelected: () => void;
  splitIntoMindmap: (nodeId: string) => Promise<void>;
  deleteCrossEdge: (edgeId: string) => void;
  addChild: (parentId: string, side: MindmapSide) => void;
  getAllowedChildSides: (nodeId: string) => readonly MindmapSide[];
  pendingEditNodeId: string | null;
  setPendingEditNodeId: (id: string | null) => void;
  editingEdgeId: string | null;
  setEditingEdgeId: (id: string | null) => void;
}

/**
 * Builds the {@link MindmapActions} object the custom node/edge components read
 * through context: style/color/image edits, edge direction and curve updates,
 * deletion, and the transient editing-state handoff. Bulk style edits apply to
 * the whole multi-selection when the clicked node is part of it.
 *
 * @example
 * const actions = useMindmapCanvasActions({ getNode, setNodes, ... });
 * <MindmapActionsProvider value={actions}>…</MindmapActionsProvider>
 */
export function useMindmapCanvasActions({
  getNode,
  getNodes,
  setNodes,
  setEdges,
  takeSnapshot,
  removeSubtrees,
  deleteSelected,
  splitIntoMindmap,
  deleteCrossEdge,
  addChild,
  getAllowedChildSides,
  pendingEditNodeId,
  setPendingEditNodeId,
  editingEdgeId,
  setEditingEdgeId,
}: UseMindmapCanvasActionsParams): MindmapActions {
  // A toolbar action on a node within a multi-selection applies to the whole
  // selection; otherwise it targets just that node. Lets users bulk-style nodes.
  const selectionTargetIds = useCallback(
    (nodeId: string): Set<string> => {
      const selectedIds = getNodes()
        .filter((node) => node.selected)
        .map((node) => node.id);
      return selectedIds.length > 1 && selectedIds.includes(nodeId)
        ? new Set(selectedIds)
        : new Set([nodeId]);
    },
    [getNodes],
  );

  return useMemo<MindmapActions>(
    () => ({
      addChild,
      getAllowedChildSides,
      toggleNodeStyle: (nodeId, style) => {
        const targets = selectionTargetIds(nodeId);
        // Derive one shared value from the clicked node so the whole selection
        // ends up consistent instead of each node toggling independently.
        const nextValue = !getNode(nodeId)?.data[style];
        takeSnapshot();
        setNodes((current) =>
          patchNodesData(current, targets, { [style]: nextValue }),
        );
      },
      setNodeColor: (nodeId, color) => {
        const targets = selectionTargetIds(nodeId);
        takeSnapshot();
        setNodes((current) =>
          patchNodesData(current, targets, { color: color ?? undefined }),
        );
      },
      setNodeImage: (nodeId, url) => {
        takeSnapshot();
        setNodes((current) =>
          patchNodesData(current, new Set([nodeId]), {
            imageUrl: url ?? undefined,
          }),
        );
      },
      deleteNode: (nodeId) => removeSubtrees([...selectionTargetIds(nodeId)]),
      deleteCrossEdge,
      deleteSelected,
      splitIntoMindmap,
      updateEdge: (edgeId, patch) =>
        setEdges((current) => patchEdgeDirection(current, edgeId, patch)),
      setEdgeCurveOffset: (edgeId, offset) =>
        setEdges((current) => patchEdgeCurveOffset(current, edgeId, offset)),
      beginEdgeDrag: takeSnapshot,
      pendingEditNodeId,
      consumePendingEdit: (nodeId) => {
        if (pendingEditNodeId === nodeId) {
          setPendingEditNodeId(null);
          return true;
        }
        return false;
      },
      editingEdgeId,
      setEditingEdgeId,
    }),
    [
      getNode,
      setNodes,
      setEdges,
      takeSnapshot,
      removeSubtrees,
      deleteSelected,
      splitIntoMindmap,
      deleteCrossEdge,
      selectionTargetIds,
      pendingEditNodeId,
      setPendingEditNodeId,
      editingEdgeId,
      setEditingEdgeId,
      addChild,
      getAllowedChildSides,
    ],
  );
}
