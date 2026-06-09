"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
  getBezierPath,
  useReactFlow,
  useStore,
} from "@xyflow/react";
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  type LucideIcon,
  Minus,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useMindmapActions } from "@/components/mindmaps/mindmap-actions-context";
import {
  DEFAULT_EDGE_DIRECTION,
  MINDMAP_EDGE_DIRECTIONS,
  type MindmapEdgeDirection,
} from "@/features/mindmaps/constants";
import { LIMITS } from "@/lib/config/limits";
import { selectedNodeCount } from "@/lib/mindmap/selection-store";
import { cn } from "@/lib/utils";

const DIRECTION_ICONS: Record<MindmapEdgeDirection, LucideIcon> = {
  none: Minus,
  backward: ArrowLeft,
  forward: ArrowRight,
  both: ArrowLeftRight,
};

const DIRECTION_LABELS: Record<MindmapEdgeDirection, string> = {
  none: "No arrow",
  backward: "Arrow at start",
  forward: "Arrow at end",
  both: "Arrows at both ends",
};

type CurveOffset = { x: number; y: number };

/**
 * Mindmap connection. Renders a bezier (optionally bent via `data.curveOffset`)
 * and, when selected, an on-edge toolbar (direction + delete) plus a draggable
 * midpoint dot for bending. Double-clicking the connection edits its label
 * inline. Mirrors the node menu instead of a separate inspector panel.
 */
export function MindmapEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerStart,
  markerEnd,
  label,
  selected,
  data,
}: Readonly<EdgeProps>) {
  const actions = useMindmapActions();
  const { screenToFlowPosition } = useReactFlow();
  // A marquee selects nodes and auto-selects the edges between them. Edge
  // controls only make sense for a lone connection, so suppress them whenever
  // any node is selected to avoid a swarm of connection menus.
  const hasNodeSelection = useStore((state) => selectedNodeCount(state) > 0);
  const showEdgeTools = Boolean(selected) && !hasNodeSelection;
  const dragging = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [labelDraft, setLabelDraft] = useState<string | null>(null);

  const offset = (data?.curveOffset as CurveOffset | undefined) ?? null;
  const direction =
    (data?.direction as MindmapEdgeDirection | undefined) ??
    DEFAULT_EDGE_DIRECTION;

  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;

  // Bent edges use a quadratic curve through (mid + offset); the visible
  // midpoint then sits at mid + offset/2 (see canvas drag math).
  let path: string;
  let anchorX: number;
  let anchorY: number;
  if (offset) {
    const ctrlX = midX + offset.x;
    const ctrlY = midY + offset.y;
    path = `M ${sourceX},${sourceY} Q ${ctrlX},${ctrlY} ${targetX},${targetY}`;
    anchorX = midX + offset.x / 2;
    anchorY = midY + offset.y / 2;
  } else {
    const [bezier, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
    });
    path = bezier;
    anchorX = labelX;
    anchorY = labelY;
  }

  const editing = actions.editingEdgeId === id;
  const draft = labelDraft ?? (typeof label === "string" ? label : "");

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commitLabel = () => {
    actions.updateEdge(id, { label: draft });
    actions.setEditingEdgeId(null);
    setLabelDraft(null);
  };

  const onDotPointerDown = (event: React.PointerEvent) => {
    event.stopPropagation();
    actions.beginEdgeDrag();
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onDotPointerMove = (event: React.PointerEvent) => {
    if (!dragging.current) {
      return;
    }
    const pointer = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    actions.setEdgeCurveOffset(id, {
      x: (pointer.x - midX) * 2,
      y: (pointer.y - midY) * 2,
    });
  };

  const onDotPointerUp = (event: React.PointerEvent) => {
    dragging.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerStart={markerStart}
        markerEnd={markerEnd}
      />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan pointer-events-auto absolute"
          style={{
            transform: `translate(-50%, -50%) translate(${anchorX}px, ${anchorY}px)`,
          }}
        >
          {/* Toolbar + label float above the midpoint so they clear the line,
              matching the node toolbar's pill style. */}
          <div className="absolute bottom-full left-1/2 mb-2 flex -translate-x-1/2 flex-col items-center gap-1">
            {showEdgeTools ? (
              <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1 shadow-md">
                {MINDMAP_EDGE_DIRECTIONS.map((option) => {
                  const Icon = DIRECTION_ICONS[option];
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() =>
                        actions.updateEdge(id, { direction: option })
                      }
                      aria-label={DIRECTION_LABELS[option]}
                      aria-pressed={direction === option}
                      title={DIRECTION_LABELS[option]}
                      className={cn(
                        "flex size-7 items-center justify-center rounded-md transition-colors",
                        direction === option
                          ? "bg-primary/10 text-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Icon className="size-4" />
                    </button>
                  );
                })}
              </div>
            ) : null}

            {editing ? (
              <input
                ref={inputRef}
                value={draft}
                onChange={(event) => setLabelDraft(event.target.value)}
                onBlur={commitLabel}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    commitLabel();
                  }
                  if (event.key === "Escape") {
                    actions.setEditingEdgeId(null);
                    setLabelDraft(null);
                  }
                }}
                maxLength={LIMITS.mindmapEdgeLabelMax}
                aria-label="Connection label"
                className="h-7 w-32 rounded-md border border-border bg-card px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              />
            ) : typeof label === "string" && label.length > 0 ? (
              <span className="rounded bg-card px-1 text-xs text-muted-foreground shadow-sm">
                {label}
              </span>
            ) : null}
          </div>

          {showEdgeTools ? (
            <button
              type="button"
              aria-label="Bend connection"
              title="Drag to bend"
              onPointerDown={onDotPointerDown}
              onPointerMove={onDotPointerMove}
              onPointerUp={onDotPointerUp}
              className="block size-3 cursor-grab rounded-full border border-primary bg-card shadow-sm active:cursor-grabbing"
            />
          ) : null}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
