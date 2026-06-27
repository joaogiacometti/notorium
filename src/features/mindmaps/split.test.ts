import { describe, expect, it } from "vitest";
import { splitMindmapGraph } from "@/features/mindmaps/split";
import type { MindmapGraph } from "@/features/mindmaps/types";

const graph: MindmapGraph = {
  nodes: [
    {
      id: "root",
      position: { x: 0, y: 0 },
      data: { label: "Original", kind: "root" },
    },
    { id: "a", position: { x: 200, y: 0 }, data: { label: "Branch" } },
    { id: "b", position: { x: 400, y: 0 }, data: { label: "Child" } },
    { id: "c", position: { x: -200, y: 0 }, data: { label: "Other" } },
  ],
  edges: [
    { id: "root-a", source: "root", target: "a" },
    { id: "a-b", source: "a", target: "b" },
    { id: "root-c", source: "root", target: "c" },
    { id: "b-c", source: "b", target: "c", cross: true },
  ],
};

describe("splitMindmapGraph", () => {
  it("moves a selected subtree into a new rooted graph", () => {
    const result = splitMindmapGraph(graph, "a");

    expect(result?.title).toBe("Branch");
    expect(result?.remainingGraph.nodes.map((node) => node.id)).toEqual([
      "root",
      "c",
    ]);
    expect(result?.remainingGraph.edges.map((edge) => edge.id)).toEqual([
      "root-c",
    ]);
    expect(result?.splitGraph.nodes).toEqual([
      {
        id: "root",
        position: { x: 0, y: 0 },
        data: { label: "Branch", kind: "root" },
      },
      { id: "b", position: { x: 200, y: 0 }, data: { label: "Child" } },
    ]);
    expect(result?.splitGraph.edges).toEqual([
      { id: "a-b", source: "root", target: "b" },
    ]);
  });

  it("refuses to split the root", () => {
    expect(splitMindmapGraph(graph, "root")).toBeNull();
  });
});
