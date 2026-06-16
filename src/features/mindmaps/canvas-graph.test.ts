import type { Edge, Node } from "@xyflow/react";
import { describe, expect, it } from "vitest";
import {
  createChildEdge,
  directionMarkers,
  selectOnlyNewChild,
  toEdge,
  toGraph,
  toRuntimeNodes,
} from "@/features/mindmaps/canvas-graph";
import { MINDMAP_IMAGE_DEFAULT_SIZE } from "@/features/mindmaps/constants";

function baseNode(overrides: Partial<Node> = {}): Node {
  return {
    id: "n1",
    position: { x: 0, y: 0 },
    data: { label: "Idea" },
    ...overrides,
  };
}

describe("directionMarkers", () => {
  it("draws no arrowheads for 'none'", () => {
    expect(directionMarkers("none")).toEqual({
      markerStart: undefined,
      markerEnd: undefined,
    });
  });

  it("draws both arrowheads for 'both'", () => {
    const markers = directionMarkers("both");
    expect(markers.markerStart).toBeDefined();
    expect(markers.markerEnd).toBeDefined();
  });

  it("points 'forward' at the target only", () => {
    const markers = directionMarkers("forward");
    expect(markers.markerStart).toBeUndefined();
    expect(markers.markerEnd).toBeDefined();
  });
});

describe("toEdge", () => {
  it("marks cross edges deletable and tree edges not", () => {
    expect(toEdge({ id: "e", source: "a", target: "b" }).deletable).toBe(false);
    expect(
      toEdge({ id: "e", source: "a", target: "b", cross: true }).deletable,
    ).toBe(true);
  });

  it("defaults the direction to forward", () => {
    expect(toEdge({ id: "e", source: "a", target: "b" }).data?.direction).toBe(
      "forward",
    );
  });
});

describe("toGraph", () => {
  it("drops a color that is not a known theme token", () => {
    const nodes = [baseNode({ data: { label: "x", color: "not-a-token" } })];
    expect(toGraph(nodes, []).nodes[0].data.color).toBeUndefined();
  });

  it("keeps a valid theme color token", () => {
    const nodes = [baseNode({ data: { label: "x", color: "chart-2" } })];
    expect(toGraph(nodes, []).nodes[0].data.color).toBe("chart-2");
  });

  it("omits falsey style flags and empty edge labels", () => {
    const nodes = [
      baseNode({ data: { label: "x", bold: false, italic: true } }),
    ];
    const edges: Edge[] = [
      { id: "e", source: "a", target: "b", label: "", data: {} },
    ];
    const graph = toGraph(nodes, edges);
    expect(graph.nodes[0].data.bold).toBeUndefined();
    expect(graph.nodes[0].data.italic).toBe(true);
    expect(graph.edges[0].label).toBeUndefined();
  });

  it("preserves the root kind", () => {
    const nodes = [baseNode({ data: { label: "Root", kind: "root" } })];
    expect(toGraph(nodes, []).nodes[0].data.kind).toBe("root");
  });

  it("persists an image node's kind, url, and measured size", () => {
    const nodes = [
      baseNode({
        data: {
          label: "",
          kind: "image",
          imageUrl: "/api/attachments/blob?p=x",
        },
        measured: { width: 300, height: 180 },
      }),
    ];
    const data = toGraph(nodes, []).nodes[0].data;
    expect(data.kind).toBe("image");
    expect(data.imageUrl).toBe("/api/attachments/blob?p=x");
    expect(data.width).toBe(300);
    expect(data.height).toBe(180);
  });

  it("prefers a measured size over the requested width/height", () => {
    const nodes = [
      baseNode({
        data: { label: "", kind: "image", imageUrl: "https://x/y.png" },
        width: 320,
        height: 320,
        measured: { width: 260, height: 140 },
      }),
    ];
    const data = toGraph(nodes, []).nodes[0].data;
    expect(data.width).toBe(260);
    expect(data.height).toBe(140);
  });
});

describe("toRuntimeNodes", () => {
  it("drives the root label from the live title and makes it permanent", () => {
    const runtime = toRuntimeNodes(
      [
        {
          id: "r",
          position: { x: 0, y: 0 },
          data: { label: "stale", kind: "root" },
        },
      ],
      "Live Title",
    );
    expect(runtime[0].type).toBe("root");
    expect(runtime[0].data.label).toBe("Live Title");
    expect(runtime[0].deletable).toBe(false);
  });

  it("restores an image node's type and persisted size", () => {
    const runtime = toRuntimeNodes(
      [
        {
          id: "img",
          position: { x: 5, y: 6 },
          data: { label: "", kind: "image", width: 200, height: 120 },
        },
      ],
      "T",
    );
    expect(runtime[0].type).toBe("image");
    expect(runtime[0].width).toBe(200);
    expect(runtime[0].height).toBe(120);
  });

  it("falls back to the default size for an image without dimensions", () => {
    const runtime = toRuntimeNodes(
      [
        {
          id: "img",
          position: { x: 0, y: 0 },
          data: { label: "", kind: "image" },
        },
      ],
      "T",
    );
    expect(runtime[0].width).toBe(MINDMAP_IMAGE_DEFAULT_SIZE);
    expect(runtime[0].height).toBe(MINDMAP_IMAGE_DEFAULT_SIZE);
  });

  it("maps a plain node to the mindmap type", () => {
    const runtime = toRuntimeNodes(
      [{ id: "n", position: { x: 0, y: 0 }, data: { label: "Idea" } }],
      "T",
    );
    expect(runtime[0].type).toBe("mindmap");
    expect(runtime[0].deletable).toBeUndefined();
  });
});

describe("createChildEdge", () => {
  it("wires right-side handles for a right child", () => {
    const edge = createChildEdge("parent", "child", "right");
    expect(edge.source).toBe("parent");
    expect(edge.target).toBe("child");
    expect(edge.sourceHandle).toBe("r-source");
    expect(edge.targetHandle).toBe("l-target");
  });
});

describe("selectOnlyNewChild", () => {
  it("deselects existing nodes and selects only the new child", () => {
    const parent = baseNode({ id: "p", selected: true });
    const other = baseNode({ id: "o", selected: true });
    const result = selectOnlyNewChild([parent, other], parent, "new");
    expect(result.every((node) => node.selected === (node.id === "new"))).toBe(
      true,
    );
    expect(result.at(-1)?.id).toBe("new");
  });
});
