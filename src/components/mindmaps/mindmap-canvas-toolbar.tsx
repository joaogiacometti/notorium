"use client";

import { useReactFlow } from "@xyflow/react";
import { Focus, Plus, Redo2, Search, Undo2 } from "lucide-react";
import { type RefObject, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { findMindmapNodeIds } from "@/features/mindmaps/search";

interface MindmapCanvasToolbarProps {
  nodes: ReactFlowNode[];
  searchInputRef: RefObject<HTMLInputElement | null>;
  canAddChild: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onAddChild: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

interface ReactFlowNode {
  id: string;
  data: { label?: unknown };
}

/**
 * Persistent canvas actions for mindmap navigation and discoverability.
 *
 * @example
 * <MindmapCanvasToolbar nodes={nodes} canUndo={canUndo} />
 */
export function MindmapCanvasToolbar({
  nodes,
  searchInputRef,
  canAddChild,
  canUndo,
  canRedo,
  onAddChild,
  onUndo,
  onRedo,
}: Readonly<MindmapCanvasToolbarProps>) {
  const { fitView, getNodes, setNodes } = useReactFlow();
  const [query, setQuery] = useState("");
  const [matchIndex, setMatchIndex] = useState(0);

  const focusMatch = (nextIndex: number, nextQuery = query) => {
    const matches = findMindmapNodeIds(getNodes(), nextQuery);
    if (matches.length === 0) {
      return;
    }

    const index = nextIndex % matches.length;
    const nodeId = matches[index];
    setMatchIndex(index);
    setNodes((current) =>
      current.map((node) => ({ ...node, selected: node.id === nodeId })),
    );
    void fitView({ nodes: [{ id: nodeId }], padding: 0.5, duration: 250 });
  };

  const handleQueryChange = (nextQuery: string) => {
    setQuery(nextQuery);
    setMatchIndex(0);
    focusMatch(0, nextQuery);
  };

  const handleSearchKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      focusMatch(matchIndex + 1);
    }
    if (event.key === "Escape") {
      setQuery("");
      event.currentTarget.blur();
    }
  };

  return (
    <div className="flex max-w-[calc(100vw-1.5rem)] items-center gap-1 rounded-lg border border-border bg-card p-1 shadow-sm">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={!canAddChild}
        onClick={onAddChild}
        aria-label="Add child to selected node"
        title="Add child to selected node (Tab)"
      >
        <Plus className="size-4" />
      </Button>
      <div className="mx-0.5 h-5 w-px bg-border" />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={!canUndo}
        onClick={onUndo}
        aria-label="Undo"
        title="Undo (Ctrl/Cmd+Z)"
      >
        <Undo2 className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={!canRedo}
        onClick={onRedo}
        aria-label="Redo"
        title="Redo (Ctrl/Cmd+Shift+Z)"
      >
        <Redo2 className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => void fitView({ padding: 0.2, maxZoom: 1 })}
        aria-label="Fit mindmap to view"
        title="Fit mindmap to view"
      >
        <Focus className="size-4" />
      </Button>
      <div className="relative min-w-0 flex-1 sm:w-44 sm:flex-none">
        <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={searchInputRef}
          value={query}
          onChange={(event) => handleQueryChange(event.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Search nodes"
          aria-label="Search mindmap nodes"
          className="h-8 min-w-0 border-0 bg-transparent pl-7 pr-2 text-xs shadow-none focus-visible:ring-1"
        />
      </div>
      <span className="sr-only">{nodes.length} nodes</span>
    </div>
  );
}
