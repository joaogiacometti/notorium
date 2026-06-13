import { describe, expect, it } from "vitest";
import type { MindmapGraph } from "@/features/mindmaps/types";
import {
  countMindmapNodes,
  ensureRootNode,
  findMindmapNodeLabelMatch,
  getMindmapImagePathnames,
  getRemovedMindmapImagePathnames,
  parseMindmapGraph,
  syncRootNodeLabel,
} from "@/features/mindmaps/utils";

function graphWithImage(pathname: string): string {
  return JSON.stringify({
    nodes: [
      {
        id: "n1",
        position: { x: 0, y: 0 },
        data: {
          label: "A",
          imageUrl: `/api/attachments/blob?pathname=${encodeURIComponent(pathname)}`,
        },
      },
    ],
    edges: [],
  });
}

describe("parseMindmapGraph", () => {
  it("returns an empty graph for null input", () => {
    expect(parseMindmapGraph(null)).toEqual({ nodes: [], edges: [] });
  });

  it("returns an empty graph for invalid JSON", () => {
    expect(parseMindmapGraph("{not json")).toEqual({ nodes: [], edges: [] });
  });
});

describe("countMindmapNodes", () => {
  it("counts nodes in a persisted graph", () => {
    const data = JSON.stringify({
      nodes: [{ id: "a", position: { x: 0, y: 0 }, data: { label: "A" } }],
      edges: [],
    });
    expect(countMindmapNodes(data)).toBe(1);
  });
});

describe("ensureRootNode", () => {
  it("injects a title-labeled root when none exists", () => {
    const result = ensureRootNode({ nodes: [], edges: [] }, "My Map");
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].data.kind).toBe("root");
    expect(result.nodes[0].data.label).toBe("My Map");
  });

  it("prepends the root ahead of existing nodes", () => {
    const graph: MindmapGraph = {
      nodes: [{ id: "a", position: { x: 5, y: 5 }, data: { label: "A" } }],
      edges: [],
    };
    const result = ensureRootNode(graph, "Title");
    expect(result.nodes).toHaveLength(2);
    expect(result.nodes[0].data.kind).toBe("root");
    expect(result.nodes[1].id).toBe("a");
  });

  it("leaves the graph untouched when a root already exists", () => {
    const graph: MindmapGraph = {
      nodes: [
        {
          id: "r",
          position: { x: 0, y: 0 },
          data: { label: "Old", kind: "root" },
        },
      ],
      edges: [],
    };
    const result = ensureRootNode(graph, "New Title");
    expect(result).toBe(graph);
    expect(result.nodes[0].data.label).toBe("Old");
  });
});

describe("syncRootNodeLabel", () => {
  it("returns the same nodes array when the root label is already current", () => {
    const nodes = [
      { id: "root", data: { label: "Current", kind: "root" } },
      { id: "branch", data: { label: "Branch" } },
    ];

    expect(syncRootNodeLabel(nodes, "Current")).toBe(nodes);
  });

  it("updates only the root node label when it changes", () => {
    const branch = { id: "branch", data: { label: "Branch" } };
    const nodes = [
      { id: "root", data: { label: "Old", kind: "root" } },
      branch,
    ];

    const result = syncRootNodeLabel(nodes, "New");

    expect(result).not.toBe(nodes);
    expect(result[0].data.label).toBe("New");
    expect(result[1]).toBe(branch);
  });
});

describe("getMindmapImagePathnames", () => {
  it("extracts attachment pathnames from node images", () => {
    const data = graphWithImage("notorium/mindmaps/u1/pic.png");
    expect(getMindmapImagePathnames(data)).toEqual([
      "notorium/mindmaps/u1/pic.png",
    ]);
  });

  it("ignores external image urls", () => {
    const data = JSON.stringify({
      nodes: [
        {
          id: "n1",
          position: { x: 0, y: 0 },
          data: { label: "A", imageUrl: "https://example.com/x.png" },
        },
      ],
      edges: [],
    });
    expect(getMindmapImagePathnames(data)).toEqual([]);
  });
});

describe("getRemovedMindmapImagePathnames", () => {
  it("returns pathnames present before but not after", () => {
    const previous = graphWithImage("notorium/mindmaps/u1/old.png");
    const next = graphWithImage("notorium/mindmaps/u1/new.png");
    expect(getRemovedMindmapImagePathnames(previous, next)).toEqual([
      "notorium/mindmaps/u1/old.png",
    ]);
  });

  it("returns nothing when the image is unchanged", () => {
    const data = graphWithImage("notorium/mindmaps/u1/keep.png");
    expect(getRemovedMindmapImagePathnames(data, data)).toEqual([]);
  });
});

describe("findMindmapNodeLabelMatch", () => {
  function graphWithLabels(...labels: string[]): string {
    return JSON.stringify({
      nodes: labels.map((label, i) => ({
        id: `n${i}`,
        position: { x: 0, y: 0 },
        data: { label },
      })),
      edges: [],
    });
  }

  it("returns the matching label (case-insensitive)", () => {
    const data = graphWithLabels("Root", "Separate Ways", "Partnership");
    expect(findMindmapNodeLabelMatch(data, "separate ways")).toBe(
      "Separate Ways",
    );
  });

  it("returns the first match when multiple nodes match", () => {
    const data = graphWithLabels("Bounded Context A", "Bounded Context B");
    expect(findMindmapNodeLabelMatch(data, "bounded")).toBe(
      "Bounded Context A",
    );
  });

  it("returns undefined when no node matches", () => {
    const data = graphWithLabels("Root", "Partnership");
    expect(findMindmapNodeLabelMatch(data, "separate ways")).toBeUndefined();
  });

  it("returns undefined for null data", () => {
    expect(findMindmapNodeLabelMatch(null, "anything")).toBeUndefined();
  });
});
