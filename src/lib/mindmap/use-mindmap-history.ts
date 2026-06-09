"use client";

import type { Edge, Node } from "@xyflow/react";
import { useCallback, useEffect, useRef, useState } from "react";

/** One reversible point in the editor: the full node and edge arrays. */
export interface MindmapSnapshot {
  nodes: Node[];
  edges: Edge[];
}

interface UseMindmapHistoryParams {
  nodes: Node[];
  edges: Edge[];
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
}

interface UseMindmapHistory {
  /** Push the current nodes/edges onto the undo stack before a mutation. */
  takeSnapshot: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const MAX_HISTORY = 100;

/**
 * Undo/redo for the mindmap canvas. React Flow ships no history, so we snapshot
 * the node/edge arrays before each mutation and restore them on undo/redo.
 * `Ctrl/Cmd+Z` undoes, `Ctrl/Cmd+Shift+Z` redoes.
 *
 * @example
 * const { takeSnapshot, undo } = useMindmapHistory({ nodes, edges, setNodes, setEdges });
 * takeSnapshot(); // call right before adding, deleting, or styling
 */
export function useMindmapHistory({
  nodes,
  edges,
  setNodes,
  setEdges,
}: UseMindmapHistoryParams): UseMindmapHistory {
  const past = useRef<MindmapSnapshot[]>([]);
  const future = useRef<MindmapSnapshot[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Keep live arrays in a ref so the keyboard handler reads current state
  // without re-binding the listener on every render.
  const live = useRef<MindmapSnapshot>({ nodes, edges });
  live.current = { nodes, edges };

  const sync = useCallback(() => {
    setCanUndo(past.current.length > 0);
    setCanRedo(future.current.length > 0);
  }, []);

  const takeSnapshot = useCallback(() => {
    past.current.push({ nodes: live.current.nodes, edges: live.current.edges });
    if (past.current.length > MAX_HISTORY) {
      past.current.shift();
    }
    future.current = [];
    sync();
  }, [sync]);

  const undo = useCallback(() => {
    const previous = past.current.pop();
    if (!previous) {
      return;
    }
    future.current.push({
      nodes: live.current.nodes,
      edges: live.current.edges,
    });
    setNodes(previous.nodes);
    setEdges(previous.edges);
    sync();
  }, [setNodes, setEdges, sync]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) {
      return;
    }
    past.current.push({ nodes: live.current.nodes, edges: live.current.edges });
    setNodes(next.nodes);
    setEdges(next.edges);
    sync();
  }, [setNodes, setEdges, sync]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        !(event.ctrlKey || event.metaKey) ||
        event.key.toLowerCase() !== "z"
      ) {
        return;
      }
      event.preventDefault();
      if (event.shiftKey) {
        redo();
      } else {
        undo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo]);

  return { takeSnapshot, undo, redo, canUndo, canRedo };
}
