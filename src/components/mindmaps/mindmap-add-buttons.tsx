"use client";

import { NodeToolbar, Position } from "@xyflow/react";
import { Plus } from "lucide-react";
import { useMindmapActions } from "@/components/mindmaps/mindmap-actions-context";

interface MindmapAddButtonsProps {
  nodeId: string;
  visible: boolean;
}

/**
 * The two `+` affordances flanking a selected node. Clicking either adds a child
 * on that side, so the map can branch left and right from any node (and the
 * root). Rendered as side `NodeToolbar`s so they float just outside the node.
 */
export function MindmapAddButtons({
  nodeId,
  visible,
}: Readonly<MindmapAddButtonsProps>) {
  const actions = useMindmapActions();

  return (
    <>
      <NodeToolbar isVisible={visible} position={Position.Left}>
        <AddButton onClick={() => actions.addChild(nodeId, "left")} />
      </NodeToolbar>
      <NodeToolbar isVisible={visible} position={Position.Right}>
        <AddButton onClick={() => actions.addChild(nodeId, "right")} />
      </NodeToolbar>
    </>
  );
}

function AddButton({ onClick }: Readonly<{ onClick: () => void }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Add child"
      title="Add child"
      className="flex size-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-primary/10 hover:text-foreground"
    >
      <Plus className="size-3.5" />
    </button>
  );
}
