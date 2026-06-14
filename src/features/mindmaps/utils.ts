import {
  EMPTY_MINDMAP_GRAPH,
  type MindmapGraph,
} from "@/features/mindmaps/types";
import { mindmapGraphSchema } from "@/features/mindmaps/validation";

/**
 * Safely parse a persisted mindmap `data` column into a graph. Returns an empty
 * graph for null/invalid input so callers never crash on legacy or corrupt rows.
 *
 * @example
 * const graph = parseMindmapGraph(mindmap.data); // { nodes, edges }
 */
export function parseMindmapGraph(data: string | null): MindmapGraph {
  if (!data) {
    return EMPTY_MINDMAP_GRAPH;
  }

  try {
    const result = mindmapGraphSchema.safeParse(JSON.parse(data));
    return result.success ? result.data : EMPTY_MINDMAP_GRAPH;
  } catch {
    return EMPTY_MINDMAP_GRAPH;
  }
}

/** Stable id for the injected root node so re-ensuring never duplicates it. */
const ROOT_NODE_ID = "root";

/**
 * Guarantee the graph has exactly one central root node. If a `kind: "root"`
 * node already exists the graph is returned unchanged; otherwise a root labeled
 * with the mindmap `title` is injected at the center. Used for legacy graphs and
 * freshly-created (empty) mindmaps, which predate the root-node design.
 *
 * @example
 * const graph = ensureRootNode(parseMindmapGraph(data), "My Mind Map");
 */
export function ensureRootNode(
  graph: MindmapGraph,
  title: string,
): MindmapGraph {
  if (graph.nodes.some((node) => node.data.kind === "root")) {
    return graph;
  }

  const root: MindmapGraph["nodes"][number] = {
    id: ROOT_NODE_ID,
    position: { x: 0, y: 0 },
    data: { label: title, kind: "root" },
  };

  return { nodes: [root, ...graph.nodes], edges: graph.edges };
}

interface RootLabelNodeData {
  kind?: string;
  label?: unknown;
}

interface RootLabelNode {
  data: RootLabelNodeData;
}

/**
 * Sync a React Flow node array's root label without changing array identity
 * when the label is already current. This prevents title sync effects from
 * scheduling no-op state updates on every render.
 *
 * @example
 * setNodes((nodes) => syncRootNodeLabel(nodes, "Chapter 1"));
 */
export function syncRootNodeLabel<TNode extends RootLabelNode>(
  nodes: TNode[],
  label: string,
): TNode[] {
  let changed = false;

  const nextNodes = nodes.map((node) => {
    if (node.data.kind !== "root" || node.data.label === label) {
      return node;
    }

    changed = true;
    return { ...node, data: { ...node.data, label } };
  });

  return changed ? nextNodes : nodes;
}

/** Internal attachment read URL prefix used by node images. */
const ATTACHMENT_BLOB_PREFIX = "/api/attachments/blob?";

/**
 * Extract the stored attachment pathnames referenced by node images in a
 * persisted `data` column. Used to clean up orphaned blobs when a mindmap's
 * images change or the mindmap is deleted.
 */
export function getMindmapImagePathnames(data: string | null): string[] {
  const pathnames = new Set<string>();
  for (const node of parseMindmapGraph(data).nodes) {
    const url = node.data.imageUrl;
    if (!url?.startsWith(ATTACHMENT_BLOB_PREFIX)) {
      continue;
    }
    try {
      const pathname = new URL(url, "http://localhost").searchParams
        .get("pathname")
        ?.trim();
      if (pathname) {
        pathnames.add(pathname);
      }
    } catch {}
  }
  return [...pathnames];
}

/**
 * Find the first node label in a mindmap that contains `query` (case-insensitive).
 * Returns undefined if nothing matches or the graph is empty.
 *
 * @example
 * findMindmapNodeLabelMatch(mindmap.data, "separate ways"); // "Separate Ways"
 */
export function findMindmapNodeLabelMatch(
  data: string | null,
  query: string,
): string | undefined {
  const lower = query.toLowerCase();
  return parseMindmapGraph(data).nodes.find((node) =>
    node.data.label.toLowerCase().includes(lower),
  )?.data.label;
}

/** Pathnames present in `previousData` but no longer referenced by `nextData`. */
export function getRemovedMindmapImagePathnames(
  previousData: string | null,
  nextData: string | null,
): string[] {
  const next = new Set(getMindmapImagePathnames(nextData));
  return getMindmapImagePathnames(previousData).filter(
    (pathname) => !next.has(pathname),
  );
}
