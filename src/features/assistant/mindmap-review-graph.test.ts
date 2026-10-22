import { describe, expect, it } from "vitest";
import { buildMindmapReviewGraph } from "@/features/assistant/mindmap-review-graph";
import type { MindmapGraph } from "@/features/mindmaps/types";

const original: MindmapGraph = {
  nodes: [
    {
      id: "root",
      position: { x: 0, y: 0 },
      data: { kind: "root", label: "T" },
    },
    { id: "a", position: { x: 210, y: 0 }, data: { label: "Area" } },
    { id: "gone", position: { x: 210, y: 72 }, data: { label: "Old" } },
  ],
  edges: [
    { id: "ra", source: "root", target: "a", sourceHandle: "r-source" },
    { id: "rg", source: "root", target: "gone", sourceHandle: "r-source" },
  ],
};
const proposed: MindmapGraph = {
  nodes: [
    original.nodes[0],
    { ...original.nodes[1], data: { label: "Area", color: "chart-2" } },
    { id: "ex1", position: { x: 420, y: 0 }, data: { label: "Example 1" } },
    { id: "ex2", position: { x: 420, y: 0 }, data: { label: "Example 2" } },
  ],
  edges: [
    original.edges[0],
    { id: "a1", source: "a", target: "ex1", sourceHandle: "r-source" },
    { id: "a2", source: "a", target: "ex2", sourceHandle: "r-source" },
  ],
};

function verticalOverlap(
  nodes: { id: string; position: { y: number } }[],
  first: string,
  second: string,
  height: number,
): boolean {
  const y = (id: string) =>
    nodes.find((node) => node.id === id)?.position.y ?? 0;
  return Math.abs(y(first) - y(second)) < height;
}

describe("buildMindmapReviewGraph", () => {
  it("marks added, removed, and restyled nodes", () => {
    const { nodes } = buildMindmapReviewGraph(original, proposed, "T");
    const stateOf = (id: string) =>
      nodes.find((node) => node.id === id)?.data.reviewState;
    expect(stateOf("ex1")).toBe("added");
    expect(stateOf("gone")).toBe("removed");
    expect(stateOf("a")).toBe("styled");
    expect(stateOf("root")).toBeUndefined();
  });

  it("re-lays out with measured review sizes so tall nodes never overlap", () => {
    const sizes = new Map(
      ["root", "a", "gone", "ex1", "ex2"].map((id) => [
        id,
        { width: 192, height: 120 },
      ]),
    );
    const { nodes } = buildMindmapReviewGraph(original, proposed, "T", sizes);
    expect(verticalOverlap(nodes, "ex1", "ex2", 120)).toBe(false);
    expect(verticalOverlap(nodes, "a", "gone", 120)).toBe(false);
  });

  it("labels only cross-connection edges", () => {
    const { edges } = buildMindmapReviewGraph(original, proposed, "T");
    expect(edges.find((edge) => edge.id === "a1")?.type).toBe("review");
    expect(edges.find((edge) => edge.id === "a1")?.data?.cross).toBeUndefined();
  });
});
