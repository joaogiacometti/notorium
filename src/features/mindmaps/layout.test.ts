import type { Edge, Node, NodeChange } from "@xyflow/react";
import { describe, expect, it } from "vitest";
import {
  CHILD_OFFSET_X,
  layoutMindmap,
  ROW_STEP,
  trackNodeHeightChanges,
} from "./layout";

function node(id: string, x = 0, y = 0, kind?: "root" | "branch"): Node {
  return {
    id,
    type: kind === "root" ? "root" : "mindmap",
    position: { x, y },
    data: kind ? { label: id, kind } : { label: id },
  };
}

function edge(source: string, target: string, side: "left" | "right"): Edge {
  return {
    id: `${source}-${target}`,
    source,
    target,
    sourceHandle: side === "right" ? "r-source" : "l-source",
    targetHandle: side === "right" ? "l-target" : "r-target",
  };
}

function posOf(nodes: Node[], id: string) {
  const found = nodes.find((n) => n.id === id);
  if (!found) {
    throw new Error(`node ${id} not found`);
  }
  return found.position;
}

describe("layoutMindmap", () => {
  it("centers a single child on its parent and offsets x by depth", () => {
    const root = node("root", 100, 50, "root");
    const result = layoutMindmap(
      [root, node("a")],
      [edge("root", "a", "right")],
    );
    expect(posOf(result, "a")).toEqual({
      x: 100 + CHILD_OFFSET_X,
      y: 50,
    });
  });

  it("keeps the parent centered as same-side children are added", () => {
    const nodes = [
      node("root", 0, 0, "root"),
      node("a", 0, 1),
      node("b", 0, 2),
      node("c", 0, 3),
    ];
    const edges = [
      edge("root", "a", "right"),
      edge("root", "b", "right"),
      edge("root", "c", "right"),
    ];
    const result = layoutMindmap(nodes, edges);
    const ys = ["a", "b", "c"].map((id) => posOf(result, id).y);
    // Evenly spaced by one row and centered on the parent's y (0).
    expect(ys).toEqual([-ROW_STEP, 0, ROW_STEP]);
  });

  it("does not overlap neighbouring branches when a middle node gains a child", () => {
    // root with three children, each already holding one same-side child.
    const nodes = [
      node("root", 0, 0, "root"),
      node("first", 0, -1),
      node("second", 0, 0),
      node("third", 0, 1),
      node("first-c", 0, -1),
      node("second-c", 0, 0),
      node("third-c", 0, 1),
      node("second-new", 0, 0),
    ];
    const edges = [
      edge("root", "first", "left"),
      edge("root", "second", "left"),
      edge("root", "third", "left"),
      edge("first", "first-c", "left"),
      edge("second", "second-c", "left"),
      edge("third", "third-c", "left"),
      edge("second", "second-new", "left"),
    ];
    const result = layoutMindmap(nodes, edges);
    const keys = new Set(result.map((n) => `${n.position.x}:${n.position.y}`));
    // No two nodes share a coordinate.
    expect(keys.size).toBe(result.length);
    // second's two children straddle second; first/third pushed clear of them.
    const second = posOf(result, "second").y;
    expect(posOf(result, "second-c").y).toBeLessThan(second);
    expect(posOf(result, "second-new").y).toBeGreaterThan(second);
    expect(posOf(result, "first").y).toBeLessThan(posOf(result, "second-c").y);
    expect(posOf(result, "third").y).toBeGreaterThan(
      posOf(result, "second-new").y,
    );
  });

  it("reserves vertical room equal to a sibling's subtree height", () => {
    // 'tall' has two children, so the next sibling 'leaf' must clear both.
    const nodes = [
      node("root", 0, 0, "root"),
      node("tall", 0, 0),
      node("leaf", 0, 1),
      node("t1", 0, 0),
      node("t2", 0, 1),
    ];
    const edges = [
      edge("root", "tall", "right"),
      edge("root", "leaf", "right"),
      edge("tall", "t1", "right"),
      edge("tall", "t2", "right"),
    ];
    const result = layoutMindmap(nodes, edges);
    // 'tall' spans 2 rows, 'leaf' spans 1, so their centers sit 1.5 rows apart
    // and 'leaf' clears tall's lowest child instead of landing on it.
    const gap = posOf(result, "leaf").y - posOf(result, "tall").y;
    expect(gap).toBe(1.5 * ROW_STEP);
    expect(posOf(result, "leaf").y).toBeGreaterThan(posOf(result, "t2").y);
  });

  it("pushes siblings clear of a measured tall node (e.g. with an image)", () => {
    const tall = {
      ...node("tall", 0, 0),
      measured: { width: 280, height: 300 },
    };
    const nodes = [node("root", 0, 0, "root"), tall, node("below", 0, 1)];
    const edges = [
      edge("root", "tall", "right"),
      edge("root", "below", "right"),
    ];
    const result = layoutMindmap(nodes, edges);
    const tallPos = posOf(result, "tall");
    const belowPos = posOf(result, "below");
    // 'below' must start past the tall node's bottom edge, not one ROW_STEP in.
    expect(belowPos.y).toBeGreaterThan(tallPos.y + 300);
  });

  it("returns the input unchanged when there are no nodes", () => {
    expect(layoutMindmap([], [])).toEqual([]);
  });
});

function dimensionChange(id: string, height: number): NodeChange {
  return { id, type: "dimensions", dimensions: { width: 200, height } };
}

describe("trackNodeHeightChanges", () => {
  it("seeds first measurements without requesting a relayout", () => {
    const heights = new Map<string, number>();
    const resized = trackNodeHeightChanges([dimensionChange("a", 46)], heights);
    expect(resized).toBe(false);
    expect(heights.get("a")).toBe(46);
  });

  it("requests a relayout when a measured node changes height", () => {
    const heights = new Map([["a", 46]]);
    // e.g. an image was attached to 'a' and its render grew to 300px.
    const resized = trackNodeHeightChanges(
      [dimensionChange("a", 300)],
      heights,
    );
    expect(resized).toBe(true);
    expect(heights.get("a")).toBe(300);
  });

  it("ignores repeat measurements at the same height", () => {
    const heights = new Map([["a", 46]]);
    expect(trackNodeHeightChanges([dimensionChange("a", 46)], heights)).toBe(
      false,
    );
  });

  it("forgets removed nodes so re-adding the id seeds fresh", () => {
    const heights = new Map([["a", 46]]);
    trackNodeHeightChanges([{ id: "a", type: "remove" }], heights);
    expect(heights.has("a")).toBe(false);
  });
});
