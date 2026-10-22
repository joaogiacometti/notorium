"use client";

import type { NodeProps } from "@xyflow/react";
import Image from "next/image";
import { MindmapHandles } from "@/components/mindmaps/mindmap-handles";
import { MindmapLabelText } from "@/components/mindmaps/mindmap-label-text";
import { mindmapNodeTint } from "@/components/mindmaps/mindmap-node-tint";
import type { MindmapNodeColor } from "@/features/mindmaps/constants";
import { cn } from "@/lib/utils";

const REVIEW_STATE_LABELS: Record<string, string> = {
  added: "Added",
  changed: "Changed",
  moved: "Moved",
  removed: "Removed",
  styled: "Restyled",
};

/** Render a node diff on the canvas without exposing mutation controls. It keeps
 * the plain node's box so the preview shows the final look; the state badge sits
 * on the border and never adds height.
 * @example nodeTypes: {review: MindmapReviewNode};
 */
export function MindmapReviewNode({ data }: Readonly<NodeProps>) {
  const state = String(data.reviewState);
  const before = typeof data.before === "string" ? data.before : "";
  const after = typeof data.after === "string" ? data.after : "";
  const image = typeof data.imageUrl === "string" ? data.imageUrl : undefined;
  const removed = state === "removed";
  return (
    <fieldset
      className={cn(
        "relative w-48 min-w-0 rounded-md border-2 border-dashed bg-card px-3 py-2 text-sm text-card-foreground shadow-sm",
        data.bold === true && "font-bold",
        data.italic === true && "italic",
        removed && "opacity-70",
      )}
      style={{
        ...mindmapNodeTint(data.color as MindmapNodeColor | undefined),
        borderColor: removed
          ? "var(--intent-danger-border)"
          : "var(--intent-success-border)",
      }}
      aria-label={`Suggested node change (${REVIEW_STATE_LABELS[state]}): ${after || before}`}
    >
      <MindmapHandles />
      <span
        className={cn(
          "absolute -top-2.5 left-2 rounded bg-card px-1 text-xs font-medium not-italic leading-4",
          removed
            ? "text-(--intent-danger-text)"
            : "text-(--intent-success-text)",
        )}
      >
        {REVIEW_STATE_LABELS[state]}
      </span>
      {image ? (
        <Image
          unoptimized
          width={192}
          height={128}
          src={image}
          alt="Existing node attachment"
          className="mb-2 max-h-32 w-full rounded object-cover"
        />
      ) : null}
      {state === "changed" ? (
        <del className="mb-1 block whitespace-pre-wrap break-words text-(--intent-danger-text) [overflow-wrap:anywhere]">
          <MindmapLabelText label={before} />
        </del>
      ) : null}
      <ReviewLabel
        label={removed ? before : after}
        removed={removed}
        highlighted={state === "added" || state === "changed"}
      />
    </fieldset>
  );
}

function ReviewLabel({
  label,
  removed,
  highlighted,
}: Readonly<{ label: string; removed: boolean; highlighted: boolean }>) {
  const className = cn(
    "block whitespace-pre-wrap break-words no-underline [overflow-wrap:anywhere]",
    removed && "text-(--intent-danger-text) line-through",
    highlighted && "text-(--intent-success-text)",
  );
  if (removed)
    return (
      <del className={className}>
        <MindmapLabelText label={label} />
      </del>
    );
  return (
    <ins className={className}>
      <MindmapLabelText label={label} />
    </ins>
  );
}
