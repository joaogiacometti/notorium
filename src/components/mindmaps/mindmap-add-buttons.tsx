"use client";

import { NodeToolbar, Position } from "@xyflow/react";
import { Plus } from "lucide-react";
import { useMindmapActions } from "@/components/mindmaps/mindmap-actions-context";
import type {
  MindmapAllowedSides,
  MindmapSide,
} from "@/features/mindmaps/sides";

interface MindmapAddButtonsProps {
  nodeId: string;
  visible: boolean;
  allowedSides: MindmapAllowedSides;
}

/**
 * The `+` affordances flanking a selected node. Branch nodes only show the side
 * they are allowed to grow toward; the root keeps both sides available.
 */
export function MindmapAddButtons({
  nodeId,
  visible,
  allowedSides,
}: Readonly<MindmapAddButtonsProps>) {
  const actions = useMindmapActions();
  const canAddLeft = allowedSides.includes("left");
  const canAddRight = allowedSides.includes("right");

  return (
    <>
      {canAddLeft ? (
        <NodeToolbar isVisible={visible} position={Position.Left}>
          <AddButton
            side="left"
            onClick={() => actions.addChild(nodeId, "left")}
          />
        </NodeToolbar>
      ) : null}
      {canAddRight ? (
        <NodeToolbar isVisible={visible} position={Position.Right}>
          <AddButton
            side="right"
            onClick={() => actions.addChild(nodeId, "right")}
          />
        </NodeToolbar>
      ) : null}
    </>
  );
}

function AddButton({
  side,
  onClick,
}: Readonly<{ side: MindmapSide; onClick: () => void }>) {
  const label = `Add ${side} child`;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex size-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-primary/10 hover:text-foreground"
    >
      <Plus className="size-3.5" />
    </button>
  );
}
