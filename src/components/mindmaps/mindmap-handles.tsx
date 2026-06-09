"use client";

import { Handle, Position } from "@xyflow/react";

/**
 * Left/right connection handles for mindmap nodes. Each side stacks an
 * overlapping source+target handle so a connection can enter or leave either
 * side, supporting the left→right flow and bidirectional branching. Handle ids
 * (`l-source`/`l-target`/`r-source`/`r-target`) are referenced when wiring
 * programmatic edges in the canvas.
 */
export function MindmapHandles() {
  return (
    <>
      <Handle type="target" id="l-target" position={Position.Left} />
      <Handle type="source" id="l-source" position={Position.Left} />
      <Handle type="target" id="r-target" position={Position.Right} />
      <Handle type="source" id="r-source" position={Position.Right} />
    </>
  );
}
