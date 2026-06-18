"use client";

import {
  addEdge,
  Background,
  type Connection,
  Controls,
  type Edge,
  type FinalConnectionState,
  type Node,
  type OnConnect,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  reconnectEdge,
  SelectionMode,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useTheme } from "next-themes";
import {
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { MindmapActionsProvider } from "@/components/mindmaps/mindmap-actions-context";
import { MindmapEdge } from "@/components/mindmaps/mindmap-edge";
import { MindmapImageNode } from "@/components/mindmaps/mindmap-image-node";
import { MindmapModeToolbar } from "@/components/mindmaps/mindmap-mode-toolbar";
import { MindmapNodeComponent } from "@/components/mindmaps/mindmap-node";
import { MindmapRootNode } from "@/components/mindmaps/mindmap-root-node";
import { useMindmapCanvasActions } from "@/components/mindmaps/use-mindmap-canvas-actions";
import { useMindmapPngExport } from "@/components/mindmaps/use-mindmap-png-export";
import {
  toEdge,
  toGraph,
  toRuntimeNodes,
} from "@/features/mindmaps/canvas-graph";
import { layoutMindmap } from "@/features/mindmaps/layout";
import { serializeMindmapSelection } from "@/features/mindmaps/serialize";
import { collectDescendants, isCrossEdge } from "@/features/mindmaps/sides";
import type { MindmapGraph } from "@/features/mindmaps/types";
import { syncRootNodeLabel } from "@/features/mindmaps/utils";
import { useMindmapAddChild } from "@/lib/mindmap/use-mindmap-add-child";
import { useMindmapCopyKey } from "@/lib/mindmap/use-mindmap-copy-key";
import { useMindmapHistory } from "@/lib/mindmap/use-mindmap-history";
import { useMindmapImagePaste } from "@/lib/mindmap/use-mindmap-image-paste";
import {
  type MindmapMode,
  useMindmapModeKeys,
} from "@/lib/mindmap/use-mindmap-mode-keys";
import { useMindmapReparentDrag } from "@/lib/mindmap/use-mindmap-reparent-drag";
import { cn } from "@/lib/utils";

/** Imperative action the detail header's kebab menu triggers from outside the
 * ReactFlowProvider. The canvas populates `exportRef.current` so the menu can
 * export the live canvas (which carries measured node sizes) to a PNG. */
export type MindmapExporter = () => Promise<void>;

interface MindmapCanvasProps {
  initialGraph: MindmapGraph;
  title: string;
  onTitleChange: (title: string) => void;
  onGraphChange: (graph: MindmapGraph) => void;
  exportRef?: RefObject<MindmapExporter | null>;
  /** Fires once, after every node has a measured size. The offscreen PNG
   * export render waits for this before capturing, so the framed bounds are
   * computed from real node dimensions instead of zero-sized placeholders. */
  onNodesMeasured?: () => void;
}

const nodeTypes = {
  mindmap: MindmapNodeComponent,
  root: MindmapRootNode,
  image: MindmapImageNode,
};
const edgeTypes = { mindmap: MindmapEdge };

// React Flow's chrome reads these CSS variables; map them to theme tokens so
// user themes (dark/halloween/catppuccin) recolor the canvas automatically.
const canvasVariables = {
  "--xy-background-color": "var(--background)",
  "--xy-edge-stroke": "var(--muted-foreground)",
  "--xy-edge-stroke-selected": "var(--primary)",
  "--xy-controls-button-background-color": "var(--card)",
  "--xy-controls-button-color": "var(--foreground)",
  "--xy-controls-button-border-color": "var(--border)",
} as React.CSSProperties;

function MindmapCanvasInner({
  initialGraph,
  title,
  onTitleChange,
  onGraphChange,
  exportRef,
  onNodesMeasured,
}: Readonly<MindmapCanvasProps>) {
  const initialNodes = useMemo<Node[]>(
    () => toRuntimeNodes(initialGraph.nodes, title),
    [initialGraph, title],
  );
  const initialEdges = useMemo<Edge[]>(
    () => initialGraph.edges.map(toEdge),
    [initialGraph],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const {
    getNode,
    getNodes,
    getEdges,
    getIntersectingNodes,
    screenToFlowPosition,
  } = useReactFlow();
  const { resolvedTheme } = useTheme();
  const [pendingEditNodeId, setPendingEditNodeId] = useState<string | null>(
    null,
  );
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
  const [mode, setMode] = useState<MindmapMode>("hand");
  const [spaceHeld, setSpaceHeld] = useState(false);
  const syncedRootLabelRef = useRef(title);
  const previousTitleRef = useRef(title);
  const canvasWrapperRef = useRef<HTMLDivElement | null>(null);
  const persistedGraph = useMemo(() => toGraph(nodes, edges), [nodes, edges]);
  const persistedGraphRef = useRef(persistedGraph);
  // Only re-serialize when the graph itself changes, not on every unrelated
  // re-render (theme, mode, editing-state toggles).
  const persistedGraphSnapshot = useMemo(
    () => JSON.stringify(persistedGraph),
    [persistedGraph],
  );
  const lastReportedGraphSnapshotRef = useRef(persistedGraphSnapshot);
  const rootLabel = nodes
    .find((node) => node.data.kind === "root")
    ?.data.label?.toString();

  persistedGraphRef.current = persistedGraph;
  // Holding Space temporarily pans regardless of the chosen tool.
  const effectiveMode: MindmapMode = spaceHeld ? "hand" : mode;

  const { takeSnapshot } = useMindmapHistory({
    nodes,
    edges,
    setNodes: (next) => setNodes(next),
    setEdges: (next) => setEdges(next),
  });

  // Report the serialized graph upward whenever nodes or edges change, so the
  // parent can debounce-autosave. Also mirror the root node's label back to the
  // title (root edits flow up); the title->root direction is handled below.
  useEffect(() => {
    if (persistedGraphSnapshot !== lastReportedGraphSnapshotRef.current) {
      lastReportedGraphSnapshotRef.current = persistedGraphSnapshot;
      onGraphChange(persistedGraphRef.current);
    }

    if (rootLabel !== undefined && rootLabel !== syncedRootLabelRef.current) {
      syncedRootLabelRef.current = rootLabel;
      onTitleChange(rootLabel);
    }
  }, [persistedGraphSnapshot, rootLabel, onGraphChange, onTitleChange]);

  // Title input edits flow down into the root node label (single source of
  // truth is the parent's title state). Guarded so it never loops with above.
  useEffect(() => {
    if (title === previousTitleRef.current) {
      return;
    }

    previousTitleRef.current = title;
    syncedRootLabelRef.current = title;

    setNodes((current) => syncRootNodeLabel(current, title));
  }, [title, setNodes]);

  const {
    onNodesChangeWithRelayout,
    onNodeDragStart,
    onNodeDrag,
    onNodeDragStop,
  } = useMindmapReparentDrag({
    getNodes,
    getEdges,
    getIntersectingNodes,
    setNodes,
    setEdges,
    onNodesChange,
    takeSnapshot,
  });

  const onConnect = useCallback<OnConnect>(
    (connection: Connection) => {
      takeSnapshot();
      setEdges((current) =>
        addEdge(
          toEdge({
            id: crypto.randomUUID(),
            source: connection.source,
            target: connection.target,
            sourceHandle: connection.sourceHandle ?? undefined,
            targetHandle: connection.targetHandle ?? undefined,
            cross: true,
          }),
          current,
        ),
      );
    },
    [setEdges, takeSnapshot],
  );

  // Dropping a dragged connection onto empty canvas creates a new node and
  // links it to the source, so users can grow a map by branching.
  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent, connectionState: FinalConnectionState) => {
      if (connectionState.isValid) {
        return;
      }

      const fromNodeId = connectionState.fromNode?.id;
      if (!fromNodeId) {
        return;
      }

      // A touch end can carry an empty changedTouches list; bail rather than
      // dereferencing an undefined point and crashing the drop handler.
      const point = "changedTouches" in event ? event.changedTouches[0] : event;
      if (!point) {
        return;
      }
      const newNodeId = crypto.randomUUID();
      const dropPosition = screenToFlowPosition({
        x: point.clientX,
        y: point.clientY,
      });
      takeSnapshot();

      setNodes((current) =>
        current
          .map((node) => ({ ...node, selected: false }))
          .concat({
            id: newNodeId,
            type: "mindmap",
            position: dropPosition,
            data: { label: "New idea" },
            selected: true,
          }),
      );
      setPendingEditNodeId(newNodeId);

      const fromIsSource = connectionState.fromHandle?.type !== "target";
      // Attach the new node on the side it was dropped relative to the source.
      const droppedRight =
        dropPosition.x >=
        (connectionState.fromNode?.position.x ?? dropPosition.x);
      const childHandle = droppedRight ? "l-target" : "r-target";
      setEdges((current) =>
        current.concat(
          toEdge({
            id: crypto.randomUUID(),
            source: fromIsSource ? fromNodeId : newNodeId,
            target: fromIsSource ? newNodeId : fromNodeId,
            sourceHandle: fromIsSource
              ? (connectionState.fromHandle?.id ?? undefined)
              : childHandle,
            targetHandle: fromIsSource
              ? childHandle
              : (connectionState.fromHandle?.id ?? undefined),
          }),
        ),
      );
    },
    [screenToFlowPosition, setNodes, setEdges, takeSnapshot],
  );

  // Remove the given nodes plus every descendant so no children are orphaned.
  const removeSubtrees = useCallback(
    (startIds: string[]) => {
      if (startIds.length === 0) {
        return;
      }
      const removed = collectDescendants(getEdges(), startIds);
      takeSnapshot();
      const survivingEdges = getEdges().filter(
        (edge) => !removed.has(edge.source) && !removed.has(edge.target),
      );
      const survivors = getNodes().filter((node) => !removed.has(node.id));
      setNodes(layoutMindmap(survivors, survivingEdges));
      setEdges(survivingEdges);
    },
    [getNodes, getEdges, setNodes, setEdges, takeSnapshot],
  );

  const deleteCrossEdge = useCallback(
    (edgeId: string) => {
      takeSnapshot();
      setEdges((current) =>
        current.filter((edge) => edge.id !== edgeId || !isCrossEdge(edge)),
      );
    },
    [setEdges, takeSnapshot],
  );

  const deleteSelected = useCallback(() => {
    const selectedNodeIds = getNodes()
      .filter((node) => node.selected && node.deletable !== false)
      .map((node) => node.id);
    const selectedCrossEdgeIds = getEdges()
      .filter((edge) => edge.selected && isCrossEdge(edge))
      .map((edge) => edge.id);
    if (selectedCrossEdgeIds.length > 0) {
      takeSnapshot();
      setEdges((current) =>
        current.filter((edge) => !selectedCrossEdgeIds.includes(edge.id)),
      );
    }
    if (selectedNodeIds.length > 0) {
      removeSubtrees(selectedNodeIds);
    }
  }, [getNodes, getEdges, setEdges, takeSnapshot, removeSubtrees]);

  // Copy the selected nodes (and their subtrees) as a markdown outline so they
  // can be pasted into an AI chat. Returns false when nothing is selected so the
  // key handler can fall back to the browser's own copy.
  const copySelected = useCallback(() => {
    const selectedNodeIds = getNodes()
      .filter((node) => node.selected)
      .map((node) => node.id);
    const text = serializeMindmapSelection(
      getNodes(),
      getEdges(),
      selectedNodeIds,
    );
    if (!text) {
      return false;
    }
    void navigator.clipboard.writeText(text).then(
      () => toast.success("Copied node text to clipboard"),
      () => toast.error("Couldn't copy to clipboard"),
    );
    return true;
  }, [getNodes, getEdges]);

  useMindmapPngExport({
    nodes,
    getNodes,
    title,
    canvasWrapperRef,
    exportRef,
    onNodesMeasured,
  });

  const {
    addChild,
    getAllowedChildSides,
    addChildToSelected,
    addSiblingToSelected,
  } = useMindmapAddChild({
    getNode,
    getNodes,
    getEdges,
    setNodes,
    setEdges,
    takeSnapshot,
    setPendingEditNodeId,
  });

  useMindmapModeKeys({
    setMode,
    setSpaceHeld,
    deleteSelected,
    addChildToSelected,
    addSiblingToSelected,
  });
  useMindmapCopyKey(copySelected);

  const actions = useMindmapCanvasActions({
    getNode,
    getNodes,
    setNodes,
    setEdges,
    takeSnapshot,
    removeSubtrees,
    deleteSelected,
    deleteCrossEdge,
    addChild,
    getAllowedChildSides,
    pendingEditNodeId,
    setPendingEditNodeId,
    editingEdgeId,
    setEditingEdgeId,
  });

  const onReconnect = useCallback(
    (oldEdge: Edge, connection: Connection) =>
      setEdges((current) => reconnectEdge(oldEdge, connection, current)),
    [setEdges],
  );

  // Ctrl/Cmd+V over empty canvas drops a standalone, resizable image node.
  useMindmapImagePaste({
    getNodes,
    setNodes,
    screenToFlowPosition,
    takeSnapshot,
    canvasWrapperRef,
  });

  return (
    <MindmapActionsProvider value={actions}>
      <div
        ref={canvasWrapperRef}
        className={cn(
          "mindmap-canvas relative size-full",
          effectiveMode === "select" ? "cursor-crosshair" : "cursor-grab",
        )}
        style={canvasVariables}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChangeWithRelayout}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onConnectEnd={onConnectEnd}
          onReconnect={onReconnect}
          onReconnectStart={takeSnapshot}
          onNodeDragStart={onNodeDragStart}
          onNodeDrag={onNodeDrag}
          onNodeDragStop={onNodeDragStop}
          onEdgeDoubleClick={(_event, edge) => setEditingEdgeId(edge.id)}
          colorMode={resolvedTheme === "dark" ? "dark" : "light"}
          panOnDrag={effectiveMode === "hand"}
          selectionOnDrag={effectiveMode === "select"}
          nodesDraggable
          selectionMode={SelectionMode.Partial}
          selectionKeyCode={null}
          // Delete is handled in useMindmapModeKeys so removal is subtree-aware.
          deleteKeyCode={null}
          proOptions={{ hideAttribution: true }}
          // Center the viewport on the saved graph (the root and its children)
          // on initial mount so the user lands on content, not empty canvas.
          fitView
          fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
        >
          <Panel position="top-left">
            <MindmapModeToolbar mode={mode} onModeChange={setMode} />
          </Panel>
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </MindmapActionsProvider>
  );
}

/**
 * Root-centered mindmap editor. Wraps ReactFlow in its provider so hooks like
 * useReactFlow work inside custom nodes, the node/edge toolbars, and undo/redo.
 *
 * @example
 * <MindmapCanvas initialGraph={graph} title={title} onTitleChange={setTitle} onGraphChange={setGraph} />
 */
export function MindmapCanvas(props: Readonly<MindmapCanvasProps>) {
  return (
    <ReactFlowProvider>
      <MindmapCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
