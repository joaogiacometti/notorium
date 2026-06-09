"use client";

import { type NodeProps, useReactFlow, useStore } from "@xyflow/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { MindmapAddButtons } from "@/components/mindmaps/mindmap-add-buttons";
import { MindmapHandles } from "@/components/mindmaps/mindmap-handles";
import type { MindmapNode } from "@/features/mindmaps/types";
import { selectedNodeCount } from "@/lib/mindmap/selection-store";

type MindmapNodeData = MindmapNode["data"];

/**
 * The single central root node. Visually distinct from branch nodes (filled
 * primary pill, larger semibold text) and permanent — it only offers the
 * two-sided add-child buttons. Its label stays in sync with the mindmap title,
 * so editing here flows back up through the canvas via `updateNodeData`.
 */
export function MindmapRootNode({
  id,
  data,
  selected,
}: Readonly<NodeProps & { data: MindmapNodeData }>) {
  const { updateNodeData } = useReactFlow();
  const isMultiSelect = useStore((state) => selectedNodeCount(state) > 1);
  const [editing, setEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const element = textareaRef.current;
    if (!element) {
      return;
    }
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }, []);

  useEffect(() => {
    if (!editing) {
      return;
    }
    resize();
    textareaRef.current?.focus();
    textareaRef.current?.select();
  }, [editing, resize]);

  return (
    <div
      className="min-w-48 max-w-72 rounded-xl bg-(--primary) px-5 py-3 text-center text-base font-semibold text-(--primary-foreground) shadow-md"
      style={{ boxShadow: selected ? "0 0 0 2px var(--ring)" : undefined }}
    >
      <MindmapAddButtons
        nodeId={id}
        visible={Boolean(selected) && !isMultiSelect}
      />

      <MindmapHandles />
      {editing ? (
        <textarea
          ref={textareaRef}
          rows={1}
          value={data.label}
          onChange={(event) => {
            updateNodeData(id, { label: event.target.value });
            resize();
          }}
          onBlur={() => setEditing(false)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              setEditing(false);
            }
          }}
          aria-label="Mindmap title"
          className="nodrag block w-full resize-none overflow-hidden break-words bg-transparent text-center font-semibold outline-none placeholder:text-(--primary-foreground)/60"
          placeholder="Untitled mindmap"
        />
      ) : (
        <button
          type="button"
          onDoubleClick={() => setEditing(true)}
          className="block w-full whitespace-pre-wrap break-words"
        >
          {data.label || "Untitled mindmap"}
        </button>
      )}
    </div>
  );
}
