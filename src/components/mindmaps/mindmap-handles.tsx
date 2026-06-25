"use client";

import { Handle, Position } from "@xyflow/react";

/**
 * Connection handles for mindmap nodes. Each side stacks an
 * overlapping source+target handle so a connection can enter or leave either
 * side. Tree edges still use left/right ids; top/bottom exist for manual
 * cross-connections.
 */
export function MindmapHandles() {
  return (
    <>
      <Handle type="target" id="t-target" position={Position.Top} />
      <Handle type="source" id="t-source" position={Position.Top} />
      <Handle type="target" id="l-target" position={Position.Left} />
      <Handle type="source" id="l-source" position={Position.Left} />
      <Handle type="target" id="r-target" position={Position.Right} />
      <Handle type="source" id="r-source" position={Position.Right} />
      <Handle type="target" id="b-target" position={Position.Bottom} />
      <Handle type="source" id="b-source" position={Position.Bottom} />
    </>
  );
}
