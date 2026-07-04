"use client";

import { NodeToolbar, Position } from "@xyflow/react";
import {
  Bold,
  ImageIcon,
  Italic,
  Loader2,
  Scissors,
  Sparkles,
  Trash2,
} from "lucide-react";
import { type CSSProperties, useState } from "react";
import { useMindmapActions } from "@/components/mindmaps/mindmap-actions-context";
import { MindmapToolbarButton } from "@/components/mindmaps/mindmap-toolbar-button";
import { MINDMAP_NODE_COLOR_TOKENS } from "@/features/mindmaps/constants";
import type { MindmapNode } from "@/features/mindmaps/types";
import { cn } from "@/lib/utils";

interface MindmapNodeToolbarProps {
  nodeId: string;
  data: MindmapNode["data"];
  isVisible: boolean;
  isMultiSelect: boolean;
  uploading: boolean;
  onImageClick: () => void;
}

/** Floating toolbar for a selected branch node: text style, color, image,
 * generation, split, and delete actions. */
export function MindmapNodeToolbar({
  nodeId,
  data,
  isVisible,
  isMultiSelect,
  uploading,
  onImageClick,
}: Readonly<MindmapNodeToolbarProps>) {
  const actions = useMindmapActions();
  const [splitting, setSplitting] = useState(false);
  const [openingGeneration, setOpeningGeneration] = useState(false);

  return (
    <NodeToolbar isVisible={isVisible} position={Position.Top}>
      <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1 shadow-md">
        <MindmapToolbarButton
          label="Bold"
          active={Boolean(data.bold)}
          onClick={() => actions.toggleNodeStyle(nodeId, "bold")}
        >
          <Bold className="size-4" />
        </MindmapToolbarButton>
        <MindmapToolbarButton
          label="Italic"
          active={Boolean(data.italic)}
          onClick={() => actions.toggleNodeStyle(nodeId, "italic")}
        >
          <Italic className="size-4" />
        </MindmapToolbarButton>
        <div className="mx-0.5 h-5 w-px bg-border" />
        <ColorSwatch
          label="Default color"
          active={!data.color}
          onClick={() => actions.setNodeColor(nodeId, null)}
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        />
        {MINDMAP_NODE_COLOR_TOKENS.map((token) => (
          <ColorSwatch
            key={token}
            label={token}
            active={data.color === token}
            onClick={() => actions.setNodeColor(nodeId, token)}
            style={{ background: `var(--${token})` }}
          />
        ))}
        <div className="mx-0.5 h-5 w-px bg-border" />
        <NodeImageButton
          visible={!isMultiSelect}
          uploading={uploading}
          imageUrl={data.imageUrl}
          onClick={onImageClick}
        />
        {!isMultiSelect && actions.generateFlashcardsFromNode ? (
          <MindmapToolbarButton
            label="Generate flashcards from branch"
            disabled={openingGeneration}
            onClick={() => {
              setOpeningGeneration(true);
              void actions.generateFlashcardsFromNode?.(nodeId).finally(() => {
                setOpeningGeneration(false);
              });
            }}
          >
            {openingGeneration ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
          </MindmapToolbarButton>
        ) : null}
        {!isMultiSelect ? (
          <MindmapToolbarButton
            label="Break into new mindmap"
            disabled={splitting}
            onClick={() => {
              setSplitting(true);
              void actions.splitIntoMindmap(nodeId).finally(() => {
                setSplitting(false);
              });
            }}
          >
            {splitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Scissors className="size-4" />
            )}
          </MindmapToolbarButton>
        ) : null}
        <MindmapToolbarButton
          label="Delete node"
          destructive
          onClick={() => actions.deleteNode(nodeId)}
        >
          <Trash2 className="size-4" />
        </MindmapToolbarButton>
      </div>
    </NodeToolbar>
  );
}

interface NodeImageButtonProps {
  visible: boolean;
  uploading: boolean;
  imageUrl: string | undefined | null;
  onClick: () => void;
}

function NodeImageButton({
  visible,
  uploading,
  imageUrl,
  onClick,
}: Readonly<NodeImageButtonProps>) {
  if (!visible) {
    return null;
  }
  return (
    <MindmapToolbarButton
      label={imageUrl ? "Replace image" : "Add image"}
      onClick={onClick}
    >
      {uploading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <ImageIcon className="size-4" />
      )}
    </MindmapToolbarButton>
  );
}

interface ColorSwatchProps {
  label: string;
  active: boolean;
  onClick: () => void;
  style: CSSProperties;
}

function ColorSwatch({
  label,
  active,
  onClick,
  style,
}: Readonly<ColorSwatchProps>) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      style={style}
      className={cn(
        "size-5 rounded-full border-2 transition-transform hover:scale-110",
        active ? "border-foreground" : "border-transparent",
      )}
    />
  );
}
