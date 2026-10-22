"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
  getBezierPath,
} from "@xyflow/react";

/** Render added and removed connections directly on the review canvas. Only
 * cross-connections get a text badge: a tree edge's change already shows on its
 * child node, and a badge there would cover neighboring nodes.
 * @example edgeTypes: {review: MindmapReviewEdge};
 */
export function MindmapReviewEdge(props: Readonly<EdgeProps>) {
  const removed = props.data?.reviewState === "removed";
  const color = removed
    ? "var(--intent-danger-text)"
    : "var(--intent-success-text)";
  const [path, x, y] = getBezierPath({
    ...props,
    curvature: removed ? 0.5 : 0.25,
  });
  const label =
    typeof props.label === "string" && props.label ? `: ${props.label}` : "";
  return (
    <>
      <BaseEdge
        path={path}
        markerStart={props.markerStart}
        markerEnd={props.markerEnd}
        style={{
          stroke: color,
          strokeWidth: 2,
          strokeDasharray: removed ? "5 4" : undefined,
        }}
      />
      {props.data?.cross === true ? (
        <EdgeLabelRenderer>
          <div
            className="pointer-events-none absolute rounded bg-card px-1 text-xs"
            style={{
              transform: `translate(-50%, -50%) translate(${x}px, ${y + (removed ? -12 : 12)}px)`,
              color,
            }}
          >
            {removed ? <del>Removed{label}</del> : <>Added{label}</>}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
