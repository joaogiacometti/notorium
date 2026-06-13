import type { Node } from "@xyflow/react";
import { toEdge } from "@/features/mindmaps/canvas-graph";
import { serializeMindmapSelection } from "@/features/mindmaps/serialize";
import { parseMindmapGraph } from "@/features/mindmaps/utils";
import { LIMITS } from "@/lib/config/limits";

interface BuildMindmapFlashcardSourceInput {
  title: string;
  data?: string | null;
}

/**
 * Builds bounded plain text from a mindmap for AI flashcard generation. The
 * graph is rendered as a nested markdown outline (node labels + edge-relation
 * labels) so the AI receives the hierarchy and relationships, not just a flat
 * list. Mirrors {@link buildNoteFlashcardSource} for the note generation path.
 *
 * @example
 * buildMindmapFlashcardSource({ title: "Cell biology", data: mindmap.data })
 */
export function buildMindmapFlashcardSource({
  title,
  data,
}: BuildMindmapFlashcardSourceInput): string {
  const graph = parseMindmapGraph(data ?? null);
  // serializeMindmapSelection reads cross-edge state from `edge.data.cross`, so
  // persisted edges must pass through toEdge before the tree walk.
  const edges = graph.edges.map(toEdge);
  const nodes: Node[] = graph.nodes.map((node) => ({
    id: node.id,
    position: node.position,
    data: { label: node.data.label },
  }));
  const outline = serializeMindmapSelection(
    nodes,
    edges,
    nodes.map((node) => node.id),
  );

  const sourceText = [`Title: ${title}`, outline]
    .filter((part) => part.trim().length > 0)
    .join("\n\n");

  if (sourceText.length <= LIMITS.flashcardAiMaxInput) {
    return sourceText;
  }

  return sourceText.slice(0, LIMITS.flashcardAiMaxInput).trimEnd();
}
