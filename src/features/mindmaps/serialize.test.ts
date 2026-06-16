import type { Edge, Node } from "@xyflow/react";
import { describe, expect, it } from "vitest";
import { serializeMindmapSelection } from "@/features/mindmaps/serialize";

function node(id: string, label?: string): Node {
  return {
    id,
    type: "mindmap",
    position: { x: 0, y: 0 },
    data: { label: label ?? id },
  };
}

function edge(source: string, target: string, label?: string): Edge {
  return {
    id: `${source}-${target}`,
    source,
    target,
    ...(label ? { label } : {}),
  };
}

function crossEdge(source: string, target: string): Edge {
  return { id: `x-${source}-${target}`, source, target, data: { cross: true } };
}

describe("serializeMindmapSelection", () => {
  it("returns an empty string when nothing is selected", () => {
    expect(serializeMindmapSelection([node("a")], [], [])).toBe("");
  });

  it("renders a selected node and its subtree as a nested outline", () => {
    const nodes = [
      node("root", "Biology"),
      node("c1", "Cells"),
      node("c2", "Mitochondria"),
    ];
    const edges = [edge("root", "c1"), edge("c1", "c2")];

    expect(serializeMindmapSelection(nodes, edges, ["root"])).toBe(
      "- Biology\n  - Cells\n    - Mitochondria",
    );
  });

  it("prefixes a child with its edge label", () => {
    const nodes = [node("a", "Heat"), node("b", "Expansion")];
    const edges = [edge("a", "b", "causes")];

    expect(serializeMindmapSelection(nodes, edges, ["a"])).toBe(
      "- Heat\n  - causes → Expansion",
    );
  });

  it("does not repeat a selected node nested under another selected ancestor", () => {
    const nodes = [node("root", "Root"), node("child", "Child")];
    const edges = [edge("root", "child")];

    expect(serializeMindmapSelection(nodes, edges, ["root", "child"])).toBe(
      "- Root\n  - Child",
    );
  });

  it("renders disjoint selections as separate top-level branches", () => {
    const nodes = [node("a", "Alpha"), node("b", "Beta")];

    expect(serializeMindmapSelection(nodes, [], ["a", "b"])).toBe(
      "- Alpha\n- Beta",
    );
  });

  it("falls back to Untitled for blank labels", () => {
    const nodes = [node("a", "   ")];

    expect(serializeMindmapSelection(nodes, [], ["a"])).toBe("- Untitled");
  });

  it("ignores cross-connections when walking the subtree", () => {
    const nodes = [node("a", "A"), node("b", "B"), node("c", "C")];
    const edges = [edge("a", "b"), crossEdge("a", "c")];

    expect(serializeMindmapSelection(nodes, edges, ["a"])).toBe("- A\n  - B");
  });

  it("does not loop on a cyclic reconnected edge", () => {
    const nodes = [node("a", "A"), node("b", "B")];
    const edges = [edge("a", "b"), edge("b", "a")];

    expect(serializeMindmapSelection(nodes, edges, ["a"])).toBe("- A\n  - B");
  });

  it("skips standalone image nodes, which carry no text", () => {
    const image: Node = {
      id: "img",
      type: "image",
      position: { x: 0, y: 0 },
      data: { label: "", kind: "image", imageUrl: "/api/attachments/blob?p=x" },
    };
    const nodes = [node("a", "Alpha"), image];

    expect(serializeMindmapSelection(nodes, [], ["a", "img"])).toBe("- Alpha");
  });
});
