"use client";

import { createContext, useContext } from "react";
import type {
  MindmapEdgeDirection,
  MindmapNodeColor,
} from "@/features/mindmaps/constants";

/** Which side of a node a child is added to. */
export type MindmapSide = "left" | "right";

/**
 * Canvas-level handlers and transient editing state shared with custom node and
 * edge components. React Flow passes only `NodeProps`/`EdgeProps`, so toolbars
 * read their actions here instead of through `data` (which would leak callbacks
 * and ephemeral UI state into the saved graph).
 */
export interface MindmapActions {
  addChild: (parentId: string, side: MindmapSide) => void;
  toggleNodeStyle: (nodeId: string, style: "bold" | "italic") => void;
  setNodeColor: (nodeId: string, color: MindmapNodeColor | null) => void;
  setNodeImage: (nodeId: string, url: string | null) => void;
  deleteNode: (nodeId: string) => void;
  /** Remove every selected node and its subtree in one undoable step. */
  deleteSelected: () => void;
  updateEdge: (
    edgeId: string,
    patch: { label?: string; direction?: MindmapEdgeDirection },
  ) => void;
  setEdgeCurveOffset: (
    edgeId: string,
    offset: { x: number; y: number },
  ) => void;
  /** Snapshot before a curve-drag gesture so it can be undone as one step. */
  beginEdgeDrag: () => void;
  /** Newly created node that should auto-enter edit mode on mount. */
  pendingEditNodeId: string | null;
  /** Returns true (and clears the pending id) when `id` was the pending node. */
  consumePendingEdit: (id: string) => boolean;
  editingEdgeId: string | null;
  setEditingEdgeId: (id: string | null) => void;
}

const MindmapActionsContext = createContext<MindmapActions | null>(null);

export const MindmapActionsProvider = MindmapActionsContext.Provider;

/** Read the canvas action handlers. Throws if used outside the canvas. */
export function useMindmapActions(): MindmapActions {
  const actions = useContext(MindmapActionsContext);
  if (!actions) {
    throw new Error(
      "useMindmapActions must be used within a MindmapActionsProvider",
    );
  }
  return actions;
}
