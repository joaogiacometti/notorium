import type { Node } from "@xyflow/react";
import { toEdge } from "@/features/mindmaps/canvas-graph";
import { serializeMindmapSelection } from "@/features/mindmaps/serialize";
import { collectDescendants, isCrossEdge } from "@/features/mindmaps/sides";
import type { MindmapGraph } from "@/features/mindmaps/types";
import { parseMindmapGraph } from "@/features/mindmaps/utils";
import { LIMITS } from "@/lib/config/limits";

interface BuildMindmapFlashcardSourceInput {
  title: string;
  data?: string | null;
  sourceNodeId?: string | null;
}

interface MindmapFlashcardSource {
  text: string;
  images: string[];
}

function escapeAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function imageHtml(url: string): string {
  return `<img src="${escapeAttribute(url)}" alt="">`;
}

function isFencedCode(value: string): boolean {
  return value.trim().startsWith("```");
}

function codeFenceLanguage(value: string): string {
  if (/\b(class|interface|namespace|public|private|protected)\b/.test(value)) {
    return "csharp";
  }
  if (/\b(function|const|let|=>)\b/.test(value)) {
    return "ts";
  }
  return "text";
}

function looksLikeCode(value: string): boolean {
  return (
    value.includes("\n") &&
    /[{};]|\b(class|function|const|let|public|private|def)\b/.test(value)
  );
}

function formatNodeLabelForAi(value: string): string {
  const trimmed = value.trim();
  if (!looksLikeCode(trimmed) || isFencedCode(trimmed)) {
    return value;
  }
  return `\`\`\`${codeFenceLanguage(trimmed)}\n${trimmed}\n\`\`\``;
}

function withImagePlaceholders(
  graph: MindmapGraph,
  includedIds: Set<string>,
): {
  nodes: Node[];
  images: string[];
} {
  const images: string[] = [];
  const nodes: Node[] = graph.nodes
    .filter((node) => includedIds.has(node.id))
    .map((node) => {
      const imageUrl =
        typeof node.data.imageUrl === "string" ? node.data.imageUrl : null;
      const placeholder = imageUrl ? `{{IMAGE_${images.length}}}` : "";
      if (imageUrl) {
        images.push(imageHtml(imageUrl));
      }
      const label =
        node.data.kind === "image"
          ? placeholder
          : [formatNodeLabelForAi(node.data.label), placeholder]
              .filter(Boolean)
              .join("\n");
      return {
        id: node.id,
        position: node.position,
        data: { label, kind: node.data.kind },
      };
    });
  return { nodes, images };
}

function nodeLabel(nodes: Node[], nodeId: string): string {
  const label = nodes.find((node) => node.id === nodeId)?.data.label;
  return typeof label === "string" && label.trim().length > 0
    ? label.trim()
    : "Untitled";
}

function crossConnectionLines(
  nodes: Node[],
  edges: ReturnType<typeof toEdge>[],
): string[] {
  const nodeIds = new Set(nodes.map((node) => node.id));
  return edges
    .filter(isCrossEdge)
    .map((edge) => {
      if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
        return null;
      }
      const relation =
        typeof edge.label === "string" && edge.label.trim().length > 0
          ? ` -- ${edge.label.trim()} -- `
          : " -- ";
      return `- ${nodeLabel(nodes, edge.source)}${relation}${nodeLabel(nodes, edge.target)}`;
    })
    .filter((line): line is string => Boolean(line));
}

function selectedNodeIds(
  graph: MindmapGraph,
  edges: ReturnType<typeof toEdge>[],
  sourceNodeId?: string | null,
): Set<string> {
  if (!sourceNodeId) {
    return new Set(graph.nodes.map((node) => node.id));
  }
  return collectDescendants(edges, [sourceNodeId]);
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
  sourceNodeId,
}: BuildMindmapFlashcardSourceInput): string {
  return buildMindmapFlashcardSourceWithImages({ title, data, sourceNodeId })
    .text;
}

/**
 * Builds AI source text plus the image HTML referenced by `{{IMAGE_N}}` tokens.
 *
 * @example
 * const { text, images } = buildMindmapFlashcardSourceWithImages({ title, data });
 */
export function buildMindmapFlashcardSourceWithImages({
  title,
  data,
  sourceNodeId,
}: BuildMindmapFlashcardSourceInput): MindmapFlashcardSource {
  const graph = parseMindmapGraph(data ?? null);
  // serializeMindmapSelection reads cross-edge state from `edge.data.cross`, so
  // persisted edges must pass through toEdge before the tree walk.
  const edges = graph.edges.map(toEdge);
  const includedIds = selectedNodeIds(graph, edges, sourceNodeId);
  const { nodes, images } = withImagePlaceholders(graph, includedIds);
  const selectedIds = sourceNodeId
    ? [sourceNodeId]
    : nodes.map((node) => node.id);
  const outline = serializeMindmapSelection(
    nodes,
    edges.filter(
      (edge) => includedIds.has(edge.source) && includedIds.has(edge.target),
    ),
    selectedIds,
  );
  const crossLines = crossConnectionLines(nodes, edges);
  const related =
    crossLines.length > 0
      ? ["Related connections:", ...crossLines].join("\n")
      : "";

  const sourceText = [`Title: ${title}`, outline, related]
    .filter((part) => part.trim().length > 0)
    .join("\n\n");

  if (sourceText.length <= LIMITS.flashcardAiMaxInput) {
    return { text: sourceText, images };
  }

  return {
    text: sourceText.slice(0, LIMITS.flashcardAiMaxInput).trimEnd(),
    images,
  };
}
