import type { ReactFlowState } from "@xyflow/react";

/**
 * React Flow store selectors for the current node selection. Used by node
 * components to switch between single- and multi-select UI (one shared toolbar,
 * no per-node add/image controls) without each node re-deriving the count.
 */

/** Number of currently selected nodes. */
export function selectedNodeCount(state: ReactFlowState): number {
  let count = 0;
  for (const node of state.nodeLookup.values()) {
    if (node.selected) {
      count += 1;
    }
  }
  return count;
}

/** Id of the first selected node, used as the lone toolbar anchor. */
export function firstSelectedNodeId(state: ReactFlowState): string | null {
  for (const node of state.nodeLookup.values()) {
    if (node.selected) {
      return node.id;
    }
  }
  return null;
}
