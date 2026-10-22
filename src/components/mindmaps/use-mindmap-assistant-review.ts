"use client";

import type { Edge, Node, NodeChange, ReactFlowProps } from "@xyflow/react";
import { useEffect, useState } from "react";
import type { PendingDocumentEdit } from "@/components/assistant/document-editor-types";
import {
  type ActiveMindmapEditorOptions,
  useActiveMindmapEditor,
} from "@/components/assistant/use-active-mindmap-editor";
import {
  buildMindmapReviewGraph,
  type ReviewNodeSizes,
} from "@/features/assistant/mindmap-review-graph";

interface MindmapAssistantReviewOptions extends ActiveMindmapEditorOptions {
  nodes: Node[];
  edges: Edge[];
  fitView: () => void;
}

interface MindmapAssistantReview {
  review: PendingDocumentEdit | null;
  nodes: Node[];
  edges: Edge[];
  /** Spread last on ReactFlow: while reviewing, the canvas is read-only and only
   * records review-node sizes; the live canvas state never changes. */
  reviewFlowProps: Partial<ReactFlowProps>;
}

/** Bind the canvas to assistant proposals and derive the display-only review graph.
 * @example const assistant = useMindmapAssistantReview({...canvas, nodes, edges, fitView});
 */
export function useMindmapAssistantReview(
  options: MindmapAssistantReviewOptions,
): MindmapAssistantReview {
  const { nodes, edges, fitView } = options;
  const review = useActiveMindmapEditor(options);
  const callId = review?.toolCallId;
  const [measured, setMeasured] = useState<{
    callId?: string;
    sizes: ReviewNodeSizes;
  }>({ sizes: new Map() });
  const sizes = measured.callId === callId ? measured.sizes : new Map();
  useEffect(() => {
    if (!callId) return;
    const frame = requestAnimationFrame(fitView);
    return () => cancelAnimationFrame(frame);
  }, [callId, fitView]);
  const onReviewNodesChange = (changes: NodeChange[]) => {
    const next = mergeMeasuredSizes(sizes, changes);
    if (next !== sizes) setMeasured({ callId, sizes: next });
  };
  if (review?.baseline.kind !== "mindmap" || review.prepared.kind !== "mindmap")
    return { review: null, nodes, edges, reviewFlowProps: {} };
  return {
    review,
    ...buildMindmapReviewGraph(
      review.baseline.graph,
      review.prepared.graph,
      review.prepared.title,
      sizes,
    ),
    reviewFlowProps: {
      ...READ_ONLY_FLOW_PROPS,
      onNodesChange: onReviewNodesChange,
    },
  };
}

const READ_ONLY_FLOW_PROPS: Partial<ReactFlowProps> = {
  onEdgesChange: undefined,
  onConnect: undefined,
  onReconnect: undefined,
  onEdgeDoubleClick: undefined,
  elementsSelectable: false,
  nodesConnectable: false,
  edgesReconnectable: false,
  nodesDraggable: false,
};

/** Same map when nothing changed, so measurement echoes cannot loop renders. */
function mergeMeasuredSizes(
  sizes: ReviewNodeSizes,
  changes: NodeChange[],
): ReviewNodeSizes {
  let next: Map<string, { width: number; height: number }> | null = null;
  for (const change of changes) {
    if (change.type !== "dimensions" || !change.dimensions) continue;
    const previous = sizes.get(change.id);
    const { width, height } = change.dimensions;
    if (previous?.width === width && previous.height === height) continue;
    next ??= new Map(sizes);
    next.set(change.id, { width, height });
  }
  return next ?? sizes;
}
