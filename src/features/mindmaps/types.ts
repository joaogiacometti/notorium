import type { z } from "zod";
import type {
  mindmapEdgeSchema,
  mindmapGraphSchema,
  mindmapNodeSchema,
} from "@/features/mindmaps/validation";

/**
 * Persisted mindmap graph shapes. These are intentionally project-owned and
 * decoupled from @xyflow/react runtime types so the stored JSON stays stable
 * even if the rendering library changes. `imageUrl` on a node is reserved for
 * the post-MVP image phase; the MVP only sets `label`.
 */
export type MindmapNode = z.infer<typeof mindmapNodeSchema>;
export type MindmapEdge = z.infer<typeof mindmapEdgeSchema>;
export type MindmapGraph = z.infer<typeof mindmapGraphSchema>;

export const EMPTY_MINDMAP_GRAPH: MindmapGraph = { nodes: [], edges: [] };
