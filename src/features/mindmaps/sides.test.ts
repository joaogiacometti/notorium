import type { Edge, Node } from "@xyflow/react";
import { describe, expect, it } from "vitest";
import {
  getDefaultChildSide,
  getNodeAllowedChildSides,
  getSourceHandleSide,
} from "@/features/mindmaps/sides";

function node(id: string, kind?: "root"): Node {
  return {
    id,
    type: kind === "root" ? "root" : "mindmap",
    position: { x: 0, y: 0 },
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

describe("getSourceHandleSide", () => {
  it("reads the side from source handle ids", () => {
    expect(getSourceHandleSide("l-source")).toBe("left");
    expect(getSourceHandleSide("r-source")).toBe("right");
    expect(getSourceHandleSide("unknown")).toBeNull();
  });
});

describe("getNodeAllowedChildSides", () => {
  it("allows root nodes to add on both sides", () => {
    const nodes = [node("root", "root")];
    expect(getNodeAllowedChildSides(nodes, [], "root")).toEqual([
      "left",
      "right",
    ]);
  });

  it("limits right-side branches to right children", () => {
    const nodes = [node("root", "root"), node("a")];
    const edges = [edge("root", "a", "right")];
    expect(getNodeAllowedChildSides(nodes, edges, "a")).toEqual(["right"]);
  });

  it("limits left-side branches to left children", () => {
    const nodes = [node("root", "root"), node("a")];
    const edges = [edge("root", "a", "left")];
    expect(getNodeAllowedChildSides(nodes, edges, "a")).toEqual(["left"]);
  });

  it("inherits the root branch side for deeper descendants", () => {
    const nodes = [node("root", "root"), node("a"), node("b")];
    const edges = [edge("root", "a", "left"), edge("a", "b", "right")];
    expect(getNodeAllowedChildSides(nodes, edges, "b")).toEqual(["left"]);
  });

  it("ignores cross-connections when tracing a node's branch side", () => {
    const nodes = [node("root", "root"), node("a"), node("b")];
    const crossIntoA: Edge = {
      ...edge("b", "a", "right"),
      id: "x-b-a",
      data: { cross: true },
    };
    // Without filtering, the cross edge would override a's tree parent (root).
    const edges = [
      edge("root", "a", "left"),
      edge("root", "b", "right"),
      crossIntoA,
    ];
    expect(getNodeAllowedChildSides(nodes, edges, "a")).toEqual(["left"]);
  });
});

describe("getDefaultChildSide", () => {
  it("prefers right for keyboard creation when both sides are allowed", () => {
    expect(getDefaultChildSide(["left", "right"])).toBe("right");
    expect(getDefaultChildSide(["right"])).toBe("right");
    expect(getDefaultChildSide(["left"])).toBe("left");
    expect(getDefaultChildSide([])).toBeNull();
  });
});
