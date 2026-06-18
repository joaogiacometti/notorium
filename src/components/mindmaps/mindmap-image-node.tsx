"use client";

import {
  type NodeProps,
  NodeResizer,
  NodeToolbar,
  Position,
} from "@xyflow/react";
import { Loader2, Trash2 } from "lucide-react";
import { useMindmapActions } from "@/components/mindmaps/mindmap-actions-context";
import { MindmapHandles } from "@/components/mindmaps/mindmap-handles";
import { MindmapToolbarButton } from "@/components/mindmaps/mindmap-toolbar-button";
import { MINDMAP_IMAGE_MIN_SIZE } from "@/features/mindmaps/constants";
import type { MindmapNode } from "@/features/mindmaps/types";

type MindmapNodeData = MindmapNode["data"];

/**
 * Standalone image node: a free-floating image (pasted onto empty canvas) that
 * the user can move, resize (aspect-ratio locked), and connect to other nodes.
 * Unlike a branch node it has no label, color, or children — only the image.
 */
export function MindmapImageNode({
  id,
  data,
  selected,
}: Readonly<NodeProps & { data: MindmapNodeData }>) {
  const actions = useMindmapActions();
  const imageUrl = typeof data.imageUrl === "string" ? data.imageUrl : null;
  // Transient flag set by the paste handler while the upload is in flight, so
  // the node shows a loading placeholder instead of an empty box. Not persisted.
  const uploading =
    (data as MindmapNodeData & { uploading?: boolean }).uploading === true;

  let nodeContent: React.ReactNode = null;
  if (imageUrl) {
    nodeContent = (
      // biome-ignore lint/performance/noImgElement: node images are user uploads served from our own attachment endpoint; next/image optimization does not apply
      <img
        src={imageUrl}
        alt=""
        draggable={false}
        className="size-full select-none rounded-md object-contain"
      />
    );
  } else if (uploading) {
    nodeContent = (
      <div className="flex size-full items-center justify-center rounded-md bg-muted/30">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    // No `overflow-hidden` here: it would clip the connection handles (which match
    // normal nodes) and the corner resize handles, both rendered half-outside the
    // node border. The img is rounded instead so corners still look clean.
    <div
      className="relative size-full rounded-md border bg-(--card)"
      style={{
        borderColor: "var(--border)",
        boxShadow: selected ? "0 0 0 2px var(--primary)" : undefined,
      }}
    >
      <NodeResizer
        isVisible={Boolean(selected)}
        keepAspectRatio
        minWidth={MINDMAP_IMAGE_MIN_SIZE}
        minHeight={MINDMAP_IMAGE_MIN_SIZE}
        // Hide the edge frame (the selection ring already shows the bounds) and
        // keep only clean square corner grips, like an image editor's resize.
        lineStyle={{ borderColor: "transparent" }}
        handleStyle={{
          width: 10,
          height: 10,
          borderRadius: 2,
          backgroundColor: "var(--background)",
          border: "1.5px solid var(--primary)",
        }}
      />
      <NodeToolbar isVisible={Boolean(selected)} position={Position.Top}>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1 shadow-md">
          <MindmapToolbarButton
            label="Delete image"
            destructive
            onClick={() => actions.deleteNode(id)}
          >
            <Trash2 className="size-4" />
          </MindmapToolbarButton>
        </div>
      </NodeToolbar>
      <MindmapHandles />
      {nodeContent}
    </div>
  );
}
