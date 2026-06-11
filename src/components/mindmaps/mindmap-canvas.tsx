"use client";

import {
  addEdge,
  Background,
  type Connection,
  Controls,
  type Edge,
  type EdgeMarker,
  type FinalConnectionState,
  MarkerType,
  type Node,
  type NodeChange,
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
import {
  type MindmapActions,
  MindmapActionsProvider,
} from "@/components/mindmaps/mindmap-actions-context";
import { MindmapEdge } from "@/components/mindmaps/mindmap-edge";
import { MindmapModeToolbar } from "@/components/mindmaps/mindmap-mode-toolbar";
import { MindmapNodeComponent } from "@/components/mindmaps/mindmap-node";
import { MindmapRootNode } from "@/components/mindmaps/mindmap-root-node";
import {
  DEFAULT_EDGE_DIRECTION,
  type MindmapEdgeDirection,
  type MindmapNodeColor,
} from "@/features/mindmaps/constants";
import {
  exportMindmapToPng,
  toPngFileName,
} from "@/features/mindmaps/export-png";
import {
  layoutMindmap,
  trackNodeHeightChanges,
} from "@/features/mindmaps/layout";
import { serializeMindmapSelection } from "@/features/mindmaps/serialize";
import {
  getDefaultChildSide,
  getNodeAllowedChildSides,
  isCrossEdge,
  type MindmapSide,
} from "@/features/mindmaps/sides";
import type { MindmapGraph } from "@/features/mindmaps/types";
import { syncRootNodeLabel } from "@/features/mindmaps/utils";
import { useMindmapCopyKey } from "@/lib/mindmap/use-mindmap-copy-key";
import { useMindmapHistory } from "@/lib/mindmap/use-mindmap-history";
import {
  type MindmapMode,
  useMindmapModeKeys,
} from "@/lib/mindmap/use-mindmap-mode-keys";
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
}

const nodeTypes = { mindmap: MindmapNodeComponent, root: MindmapRootNode };
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

const arrowMarker: EdgeMarker = {
  type: MarkerType.ArrowClosed,
  color: "var(--muted-foreground)",
};

// Translate a stored direction into the start/end arrowheads React Flow draws.
function directionMarkers(direction: MindmapEdgeDirection) {
  return {
    markerStart:
      direction === "both" || direction === "backward"
        ? arrowMarker
        : undefined,
    markerEnd:
      direction === "both" || direction === "forward" ? arrowMarker : undefined,
  };
}

function toEdge(
  edge: Pick<MindmapGraph["edges"][number], "id" | "source" | "target"> & {
    sourceHandle?: string;
    targetHandle?: string;
    label?: string;
    direction?: MindmapEdgeDirection;
    curveOffset?: { x: number; y: number };
    cross?: boolean;
  },
): Edge {
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

function toGraph(nodes: Node[], edges: Edge[]): MindmapGraph {
  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      position: node.position,
      data: {
        label: String(node.data.label ?? ""),
        ...(typeof node.data.color === "string"
          ? { color: node.data.color as MindmapNodeColor }
          : {}),
        ...(node.data.bold === true ? { bold: true } : {}),
        ...(node.data.italic === true ? { italic: true } : {}),
        ...(node.data.kind === "root" ? { kind: "root" as const } : {}),
        ...(typeof node.data.imageUrl === "string"
          ? { imageUrl: node.data.imageUrl }
          : {}),
      },
    })),
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

function createChildEdge(
  parentId: string,
  childId: string,
  side: MindmapSide,
): Edge {
  const toRight = side === "right";
  return toEdge({
    id: crypto.randomUUID(),
    source: parentId,
    target: childId,
    sourceHandle: toRight ? "r-source" : "l-source",
    targetHandle: toRight ? "l-target" : "r-target",
  });
}

function selectOnlyNewChild(
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

/** Collect `startIds` plus every node reachable from them via tree edges. */
function collectDescendants(edges: Edge[], startIds: string[]): Set<string> {
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    // Cross-connections don't make the target a descendant; following them
    // would delete nodes that are merely linked across the tree.
    if (isCrossEdge(edge)) {
      continue;
    }
    const targets = adjacency.get(edge.source) ?? [];
    targets.push(edge.target);
    adjacency.set(edge.source, targets);
  }
  const reached = new Set(startIds);
  const stack = [...startIds];
  while (stack.length > 0) {
    const id = stack.pop();
    if (!id) {
      continue;
    }
    for (const target of adjacency.get(id) ?? []) {
      if (!reached.has(target)) {
        reached.add(target);
        stack.push(target);
      }
    }
  }
  return reached;
}

function MindmapCanvasInner({
  initialGraph,
  title,
  onTitleChange,
  onGraphChange,
  exportRef,
}: Readonly<MindmapCanvasProps>) {
  const initialNodes = useMemo<Node[]>(
    () =>
      initialGraph.nodes.map((node) => ({
        id: node.id,
        type: node.data.kind === "root" ? "root" : "mindmap",
        position: node.position,
        data:
          node.data.kind === "root"
            ? { ...node.data, label: title }
            : { ...node.data },
        // The root node is permanent: block Delete-key removal.
        ...(node.data.kind === "root" ? { deletable: false } : {}),
      })),
    [initialGraph, title],
  );
  const initialEdges = useMemo<Edge[]>(
    () => initialGraph.edges.map(toEdge),
    [initialGraph],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { getNode, getNodes, getEdges, screenToFlowPosition } = useReactFlow();
  const { resolvedTheme } = useTheme();
  const [pendingEditNodeId, setPendingEditNodeId] = useState<string | null>(
    null,
  );
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
  const [mode, setMode] = useState<MindmapMode>("hand");
  const [spaceHeld, setSpaceHeld] = useState(false);
  const syncedRootLabelRef = useRef(title);
  const previousTitleRef = useRef(title);
  const persistedGraph = useMemo(() => toGraph(nodes, edges), [nodes, edges]);
  const persistedGraphRef = useRef(persistedGraph);
  const persistedGraphSnapshot = JSON.stringify(persistedGraph);
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

  // Re-run the layout when an already-rendered node changes height (image
  // added/removed or finished loading) so nodes below it are pushed clear.
  const knownNodeHeightsRef = useRef(new Map<string, number>());
  const onNodesChangeWithRelayout = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);
      if (trackNodeHeightChanges(changes, knownNodeHeightsRef.current)) {
        setNodes((current) => layoutMindmap(current, getEdges()));
      }
    },
    [onNodesChange, setNodes, getEdges],
  );

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

      const point = "changedTouches" in event ? event.changedTouches[0] : event;
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

  // Export the live canvas to a PNG. Reads `--background` at call time so the
  // image matches the active theme rather than a hardcoded color.
  const exportToPng = useCallback(async () => {
    const backgroundColor =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--background")
        .trim() || "#ffffff";
    try {
      await exportMindmapToPng(
        getNodes(),
        toPngFileName(title),
        backgroundColor,
      );
      toast.success("Exported mindmap as PNG");
    } catch {
      toast.error("Couldn't export the mindmap");
    }
  }, [getNodes, title]);

  // Hand the exporter to the detail header's kebab menu, which lives outside the
  // ReactFlowProvider and so cannot read the live nodes itself.
  useEffect(() => {
    if (!exportRef) {
      return;
    }
    exportRef.current = exportToPng;
    return () => {
      if (exportRef.current === exportToPng) {
        exportRef.current = null;
      }
    };
  }, [exportRef, exportToPng]);

  const addChild = useCallback(
    (parentId: string, side: MindmapSide) => {
      const parent = getNode(parentId);
      if (!parent) {
        return;
      }
      const currentNodes = getNodes();
      const currentEdges = getEdges();
      const allowed = getNodeAllowedChildSides(
        currentNodes,
        currentEdges,
        parentId,
      );
      if (!allowed.includes(side)) {
        return;
      }
      const newNodeId = crypto.randomUUID();
      takeSnapshot();
      const nextEdges = currentEdges.concat(
        createChildEdge(parentId, newNodeId, side),
      );
      const nextNodes = selectOnlyNewChild(currentNodes, parent, newNodeId);
      setNodes(layoutMindmap(nextNodes, nextEdges));
      setEdges(nextEdges);
      setPendingEditNodeId(newNodeId);
    },
    [getNode, getNodes, getEdges, setNodes, setEdges, takeSnapshot],
  );

  const getAllowedChildSides = useCallback(
    (nodeId: string) =>
      getNodeAllowedChildSides(getNodes(), getEdges(), nodeId),
    [getNodes, getEdges],
  );

  const addChildToSelected = useCallback(() => {
    const selectedNodes = getNodes().filter((node) => node.selected);
    if (selectedNodes.length !== 1) {
      return;
    }
    const side = getDefaultChildSide(getAllowedChildSides(selectedNodes[0].id));
    if (side) {
      addChild(selectedNodes[0].id, side);
    }
  }, [getNodes, getAllowedChildSides, addChild]);

  const addSiblingToSelected = useCallback(() => {
    const selectedNodes = getNodes().filter((node) => node.selected);
    if (selectedNodes.length !== 1) {
      return;
    }
    const nodeId = selectedNodes[0].id;
    const parentEdge = getEdges().find((edge) => edge.target === nodeId);
    if (!parentEdge) {
      return;
    }
    const side: MindmapSide =
      parentEdge.sourceHandle === "r-source" ? "right" : "left";
    addChild(parentEdge.source, side);
  }, [getNodes, getEdges, addChild]);

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

  useMindmapModeKeys({
    setMode,
    setSpaceHeld,
    deleteSelected,
    addChildToSelected,
    addSiblingToSelected,
  });
  useMindmapCopyKey(copySelected);

  const actions = useMemo<MindmapActions>(
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
          current.map((node) =>
            targets.has(node.id)
              ? { ...node, data: { ...node.data, [style]: nextValue } }
              : node,
          ),
        );
      },
      setNodeColor: (nodeId, color) => {
        const targets = selectionTargetIds(nodeId);
        takeSnapshot();
        setNodes((current) =>
          current.map((node) =>
            targets.has(node.id)
              ? { ...node, data: { ...node.data, color: color ?? undefined } }
              : node,
          ),
        );
      },
      setNodeImage: (nodeId, url) => {
        takeSnapshot();
        setNodes((current) =>
          current.map((node) =>
            node.id === nodeId
              ? { ...node, data: { ...node.data, imageUrl: url ?? undefined } }
              : node,
          ),
        );
      },
      deleteNode: (nodeId) => removeSubtrees([...selectionTargetIds(nodeId)]),
      deleteCrossEdge,
      deleteSelected,
      updateEdge: (edgeId, patch) =>
        setEdges((current) =>
          current.map((edge) => {
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
          }),
        ),
      setEdgeCurveOffset: (edgeId, offset) =>
        setEdges((current) =>
          current.map((edge) =>
            edge.id === edgeId
              ? { ...edge, data: { ...edge.data, curveOffset: offset } }
              : edge,
          ),
        ),
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
      deleteCrossEdge,
      selectionTargetIds,
      pendingEditNodeId,
      editingEdgeId,
      addChild,
      getAllowedChildSides,
    ],
  );

  const onReconnect = useCallback(
    (oldEdge: Edge, connection: Connection) =>
      setEdges((current) => reconnectEdge(oldEdge, connection, current)),
    [setEdges],
  );

  return (
    <MindmapActionsProvider value={actions}>
      <div
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
          onNodeDragStart={takeSnapshot}
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
