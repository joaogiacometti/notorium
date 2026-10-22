"use client";

import type { Edge, Node } from "@xyflow/react";
import { useEffect, useRef } from "react";
import { useAssistantWorkspace } from "@/components/assistant/assistant-workspace-context";
import type { PendingDocumentEdit } from "@/components/assistant/document-editor-types";
import { createDraftRevisionCounter } from "@/components/assistant/draft-revision";
import { buildMindmapDraft } from "@/features/assistant/mindmap-edit-content";
import {
  toEdge,
  toGraph,
  toRuntimeNodes,
} from "@/features/mindmaps/canvas-graph";
import { readNodeColorPalette } from "@/lib/mindmap/node-color-palette";

export interface ActiveMindmapEditorOptions {
  enabled: boolean;
  identity: object;
  title: string;
  subjectPath?: string;
  getNodes: () => Node[];
  getEdges: () => Edge[];
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  takeSnapshot: () => void;
  /** Runs after a proposal is applied, e.g. to re-lay out once nodes are measured. */
  onApplied?: () => void;
}

/** Bind proposals to the canvas's live graph and existing undo/autosave path.
 * @example useActiveMindmapEditor({enabled, identity: initialGraph, title, ...canvas});
 */
export function useActiveMindmapEditor(
  options: ActiveMindmapEditorOptions,
): PendingDocumentEdit | null {
  const sessionRef = useRef("");
  const workspace = useAssistantWorkspace();
  const current = useRef({ options, workspace });
  current.current = { options, workspace };
  const hasWorkspace = Boolean(workspace);
  const identity = options.identity;
  useEffect(() => {
    if (!options.enabled || !hasWorkspace) return;
    const sessionId = crypto.randomUUID();
    sessionRef.current = sessionId;
    const nextRevision = createDraftRevisionCounter();
    return current.current.workspace?.documents.register({
      sessionId,
      available: () =>
        current.current.options.identity === identity &&
        !current.current.options
          .getNodes()
          .some((node) => node.data.uploading === true),
      snapshot: () => {
        const canvas = current.current.options;
        const nodes = canvas.getNodes();
        const graph = toGraph(nodes, canvas.getEdges());
        const title = canvas.title;
        const revision = nextRevision(JSON.stringify([title, graph]));
        return {
          kind: "mindmap",
          graph,
          draft: {
            ...buildMindmapDraft(
              sessionId,
              revision,
              title,
              graph,
              nodes.filter((node) => node.selected).map((node) => node.id),
            ),
            subjectPath: canvas.subjectPath,
            palette: readNodeColorPalette(),
          },
        };
      },
      apply: (change) => {
        if (change.kind !== "mindmap")
          throw new Error(`Invalid edit kind ${change.kind}; expected mindmap`);
        const canvas = current.current.options;
        canvas.takeSnapshot();
        canvas.setNodes(toRuntimeNodes(change.graph.nodes, change.title));
        canvas.setEdges(change.graph.edges.map(toEdge));
        canvas.onApplied?.();
      },
    });
  }, [options.enabled, identity, hasWorkspace]);
  return workspace?.documents.pending?.baseline.draft.sessionId ===
    sessionRef.current
    ? workspace.documents.pending
    : null;
}
