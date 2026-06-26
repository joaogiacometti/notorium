import type { Edge } from "@xyflow/react";
import { describe, expect, it } from "vitest";
import { canReparent, reparentNode } from "@/features/mindmaps/reparent";
import { getSourceHandleSide } from "@/features/mindmaps/sides";

function edge(
  source: string,
  target: string,
  side: "left" | "right" = "right",
): Edge {
  return {
    id: `${source}-${target}`,
    source,
    target,
    sourceHandle: side === "right" ? "r-source" : "l-source",
    targetHandle: side === "right" ? "l-target" : "r-target",
  };
}

function crossEdge(source: string, target: string): Edge {
  return { id: `x-${source}-${target}`, source, target, data: { cross: true } };
}

// root → a → b → c, plus a sibling root → d
const tree: Edge[] = [
  edge("root", "a"),
  edge("a", "b"),
  edge("b", "c"),
  edge("root", "d"),
];

describe("canReparent", () => {
  it("accepts moving a node under an unrelated node", () => {
    expect(canReparent(tree, "a", "d")).toBe(true);
  });

  it("rejects moving a node onto itself", () => {
    expect(canReparent(tree, "a", "a")).toBe(false);
  });

  it("rejects moving a node onto its current parent without changing side", () => {
    expect(canReparent(tree, "a", "root", "right")).toBe(false);
  });

  it("accepts moving a node across sides under its current parent", () => {
    expect(canReparent(tree, "a", "root", "left")).toBe(true);
  });

  it("rejects moving a node onto one of its descendants (cycle)", () => {
    expect(canReparent(tree, "a", "c")).toBe(false);
  });

  it("rejects moving the root (no incoming tree edge)", () => {
    expect(canReparent(tree, "root", "a")).toBe(false);
  });

  it("ignores cross edges when checking for descendants", () => {
    // A cross link a→d must not make d a descendant of a.
    const withCross = [...tree, crossEdge("a", "d")];
    expect(canReparent(withCross, "a", "d")).toBe(true);
  });
});

describe("reparentNode", () => {
  it("repoints the incoming edge at the new parent, preserving its id", () => {
    const next = reparentNode(tree, "a", "d", "right");
    const moved = next.find((e) => e.target === "a");
    expect(moved?.id).toBe("root-a");
    expect(moved?.source).toBe("d");
    expect(moved?.sourceHandle).toBe("r-source");
    expect(moved?.targetHandle).toBe("l-target");
  });

  it("preserves unrelated edge fields like label", () => {
    const labeled: Edge[] = [{ ...edge("root", "a"), label: "is a" }];
    const next = reparentNode([...labeled, edge("x", "y")], "a", "x", "right");
    expect(next.find((e) => e.target === "a")?.label).toBe("is a");
  });

  it("flips the whole subtree to the new side when the side changes", () => {
    // Move `a` (currently right branch) to the left.
    const next = reparentNode(tree, "a", "d", "left");
    for (const target of ["a", "b", "c"]) {
      const sourceEdge = next.find((e) => e.target === target);
      expect(getSourceHandleSide(sourceEdge?.sourceHandle)).toBe("left");
    }
    // The untouched sibling keeps its side.
    expect(
      getSourceHandleSide(next.find((e) => e.target === "d")?.sourceHandle),
    ).toBe("right");
  });

  it("flips a root child to the other side without changing parent", () => {
    const next = reparentNode(tree, "a", "root", "left");
    expect(next.find((e) => e.target === "a")?.source).toBe("root");
    expect(
      getSourceHandleSide(next.find((e) => e.target === "a")?.sourceHandle),
    ).toBe("left");
  });

  it("leaves subtree edges untouched when the side does not change", () => {
    const next = reparentNode(tree, "a", "d", "right");
    expect(next.find((e) => e.target === "b")).toEqual(
      tree.find((e) => e.target === "b"),
    );
    expect(next.find((e) => e.target === "c")).toEqual(
      tree.find((e) => e.target === "c"),
    );
  });

  it("does not rewrite cross edges inside the moved subtree", () => {
    const withCross = [...tree, crossEdge("b", "d")];
    const next = reparentNode(withCross, "a", "d", "left");
    expect(next.find((e) => e.id === "x-b-d")).toEqual(crossEdge("b", "d"));
  });
});
