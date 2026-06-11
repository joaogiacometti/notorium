import type { Edge, Node } from "@xyflow/react";
import { describe, expect, it } from "vitest";
import {
  createChildEdge,
  directionMarkers,
  selectOnlyNewChild,
  toEdge,
  toGraph,
} from "@/features/mindmaps/canvas-graph";

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
