import {
  type MindmapDraft,
  type MindmapEditsInput,
  type MindmapOperation,
  mindmapOperationsInOrder,
} from "@/features/assistant/document-edit-contract";
import { STUDY_CONTEXT_MAX_CHARS } from "@/features/assistant/study-context";
import {
  toEdge,
  toGraph,
  toRuntimeNodes,
} from "@/features/mindmaps/canvas-graph";
import { layoutMindmap } from "@/features/mindmaps/layout";
import { canReparent, reparentNode } from "@/features/mindmaps/reparent";
import {
  collectDescendants,
  getSourceHandleSide,
  handlesForSide,
  type MindmapSide,
} from "@/features/mindmaps/sides";
import type { MindmapGraph, MindmapNode } from "@/features/mindmaps/types";
import { editMindmapSchema } from "@/features/mindmaps/validation";
import { normalizeOverEscapedLatex } from "@/lib/math/dollar-math";

/** Capture a bounded graph view, prioritizing selected branches over other nodes.
 * @example buildMindmapDraft("s", 0, "Cells", graph, ["branch"]);
 */
export function buildMindmapDraft(
  sessionId: string,
  revision: number,
  title: string,
  graph: MindmapGraph,
  selected: string[] = [],
): MindmapDraft {
  const runtimeEdges = graph.edges.map(toEdge);
  const root = graph.nodes.find((node) => node.data.kind === "root");
  const priorities = [
    ...new Set([
      ...collectDescendants(runtimeEdges, selected),
      ...collectDescendants(runtimeEdges, root ? [root.id] : []),
      ...graph.nodes.map((node) => node.id),
    ]),
  ];
  const draft: MindmapDraft = {
    kind: "mindmap",
    sessionId,
    revision,
    title,
    partial: false,
    nodes: [],
    edges: [],
  };
  for (const id of priorities) includeMindmapNode(draft, graph, id);
  const visible = new Set(draft.nodes.map((node) => node.id));
  draft.nodes = draft.nodes.map((node) => ({
    ...node,
    completeSubtree: [...collectDescendants(runtimeEdges, [node.id])].every(
      (id) => visible.has(id),
    ),
  }));
  draft.partial =
    visible.size !==
      graph.nodes.filter((node) => node.data.kind !== "image").length ||
    draft.edges.length !== graph.edges.length;
  return draft;
}

function includeMindmapNode(
  draft: MindmapDraft,
  graph: MindmapGraph,
  id: string,
): void {
  const node = graph.nodes.find((candidate) => candidate.id === id);
  if (!node || node.data.kind === "image") return;
  const nodes = [
    ...draft.nodes,
    {
      id,
      label: node.data.label,
      root: node.data.kind === "root",
      completeSubtree: false,
      ...(node.data.color ? { color: node.data.color } : {}),
      ...(node.data.bold ? { bold: true as const } : {}),
      ...(node.data.italic ? { italic: true as const } : {}),
    },
  ];
  const visible = new Set(nodes.map((entry) => entry.id));
  const edges = graph.edges
    .filter((edge) => visible.has(edge.source) && visible.has(edge.target))
    .map(({ id, source, target, cross, label, direction }) => ({
      id,
      source,
      target,
      cross: cross === true,
      label,
      direction,
    }));
  if (JSON.stringify({ nodes, edges }).length > STUDY_CONTEXT_MAX_CHARS) return;
  draft.nodes = nodes;
  draft.edges = edges;
}

/** Validate every operation against the captured view before returning a new graph.
 * @example const next = prepareMindmapEdits(draft, graph, proposal);
 */
export function prepareMindmapEdits(
  draft: MindmapDraft,
  graph: MindmapGraph,
  proposal: MindmapEditsInput,
): { title: string; graph: MindmapGraph } {
  const next = structuredClone(graph);
  const visible = new Set(draft.nodes.map((node) => node.id));
  const aliases = new Map<string, string>();
  const operations = mindmapOperationsInOrder(proposal);
  for (const operation of operations)
    applyMindmapOperation(next, draft, operation, visible, aliases);
  const root = next.nodes.find((node) => node.data.kind === "root");
  const title = root?.data.label ?? draft.title;
  const structural = operations.some((operation) =>
    ["add", "move", "remove"].includes(operation.kind),
  );
  const result = structural
    ? toGraph(
        layoutMindmap(
          toRuntimeNodes(next.nodes, title),
          next.edges.map(toEdge),
        ),
        next.edges.map(toEdge),
      )
    : next;
  editMindmapSchema.parse({ id: "draft", title, data: JSON.stringify(result) });
  return { title, graph: result };
}

function requireVisibleNode(
  graph: MindmapGraph,
  visible: Set<string>,
  id: string,
): MindmapNode {
  const node = graph.nodes.find((entry) => entry.id === id);
  if (!visible.has(id) || !node || node.data.kind === "image")
    throw new Error(
      `Invalid node reference ${id}; expected a visible live branch`,
    );
  return node;
}

function applyMindmapOperation(
  graph: MindmapGraph,
  draft: MindmapDraft,
  operation: MindmapOperation,
  visible: Set<string>,
  aliases: Map<string, string>,
): void {
  const resolve = (id: string) => aliases.get(id) ?? id;
  if (operation.kind === "add") {
    addMindmapBranch(graph, operation, visible, aliases);
    return;
  }
  if (
    operation.kind === "connect" ||
    operation.kind === "disconnect" ||
    operation.kind === "updateConnection"
  ) {
    editMindmapConnection(graph, draft, operation, visible, resolve);
    return;
  }
  const node = requireVisibleNode(graph, visible, resolve(operation.nodeId));
  if (operation.kind === "rename") {
    node.data.label = normalizeOverEscapedLatex(operation.label);
    return;
  }
  if (node.data.kind === "root")
    throw new Error(
      `Invalid ${operation.kind} of root ${node.id}; expected a non-root branch`,
    );
  if (operation.kind === "remove") {
    removeMindmapBranch(graph, draft, node.id, visible);
    return;
  }
  if (operation.kind === "style") {
    styleMindmapNode(node, operation);
    return;
  }
  const parent = requireVisibleNode(
    graph,
    visible,
    resolve(operation.parentId),
  );
  const edges = graph.edges.map(toEdge);
  const side = branchSide(graph, parent.id);
  if (!canReparent(edges, node.id, parent.id, side))
    throw new Error(
      `Invalid parent ${parent.id} for ${node.id}; expected a new parent outside its subtree`,
    );
  graph.edges = toGraph(
    [],
    reparentNode(edges, node.id, parent.id, side),
  ).edges;
}

// New children grow on the same side as their parent's own branch.
function branchSide(graph: MindmapGraph, parentId: string): MindmapSide {
  const incoming = graph.edges.find(
    (edge) => edge.target === parentId && !edge.cross,
  );
  return getSourceHandleSide(incoming?.sourceHandle) ?? "right";
}

function addMindmapBranch(
  graph: MindmapGraph,
  operation: Extract<MindmapOperation, { kind: "add" }>,
  visible: Set<string>,
  aliases: Map<string, string>,
): void {
  if (
    aliases.has(operation.id) ||
    graph.nodes.some((node) => node.id === operation.id)
  )
    throw new Error(
      `Duplicate new node ${operation.id}; expected a unique proposal identifier`,
    );
  const parent = requireVisibleNode(
    graph,
    visible,
    aliases.get(operation.parentId) ?? operation.parentId,
  );
  const id = crypto.randomUUID();
  aliases.set(operation.id, id);
  visible.add(id);
  graph.nodes.push({
    id,
    position: { ...parent.position },
    data: { label: normalizeOverEscapedLatex(operation.label) },
  });
  const side = branchSide(graph, parent.id);
  graph.edges.push({
    id: crypto.randomUUID(),
    source: parent.id,
    target: id,
    ...handlesForSide(side),
  });
}

function styleMindmapNode(
  node: MindmapNode,
  style: Extract<MindmapOperation, { kind: "style" }>,
): void {
  if (style.color === "none") delete node.data.color;
  else if (style.color) node.data.color = style.color;
  // Stored graphs omit false flags, so clearing deletes instead of writing false.
  for (const flag of ["bold", "italic"] as const) {
    if (style[flag] === true) node.data[flag] = true;
    if (style[flag] === false) delete node.data[flag];
  }
}

function removeMindmapBranch(
  graph: MindmapGraph,
  draft: MindmapDraft,
  nodeId: string,
  visible: Set<string>,
): void {
  const descendants = collectDescendants(graph.edges.map(toEdge), [nodeId]);
  const original = draft.nodes.find((node) => node.id === nodeId);
  if (
    (original && !original.completeSubtree) ||
    [...descendants].some((id) => !visible.has(id))
  )
    throw new Error(
      `Incomplete subtree ${nodeId}; expected all descendants in context`,
    );
  graph.nodes = graph.nodes.filter((node) => !descendants.has(node.id));
  graph.edges = graph.edges.filter(
    (edge) => !descendants.has(edge.source) && !descendants.has(edge.target),
  );
}

function editMindmapConnection(
  graph: MindmapGraph,
  draft: MindmapDraft,
  operation: Extract<
    MindmapOperation,
    { kind: "connect" | "disconnect" | "updateConnection" }
  >,
  visible: Set<string>,
  resolve: (id: string) => string,
): void {
  if (operation.kind === "connect") {
    const source = requireVisibleNode(
      graph,
      visible,
      resolve(operation.source),
    ).id;
    const target = requireVisibleNode(
      graph,
      visible,
      resolve(operation.target),
    ).id;
    if (source === target)
      throw new Error(
        `Invalid connection ${source}:${target}; expected distinct endpoints`,
      );
    graph.edges.push({
      id: crypto.randomUUID(),
      source,
      target,
      cross: true,
      label: operation.label,
      direction: operation.direction,
    });
    return;
  }
  const edge = graph.edges.find((entry) => entry.id === operation.edgeId);
  if (!edge?.cross || !draft.edges.some((entry) => entry.id === edge.id))
    throw new Error(
      `Invalid connection ${operation.edgeId}; expected a visible cross-connection`,
    );
  if (operation.kind === "disconnect") {
    graph.edges = graph.edges.filter((entry) => entry.id !== edge.id);
    return;
  }
  edge.label = operation.label;
  edge.direction = operation.direction;
}
