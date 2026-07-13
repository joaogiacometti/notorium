import type { Node } from "@xyflow/react";
import { describe, expect, it } from "vitest";
import { findMindmapNodeIds } from "@/features/mindmaps/search";

function node(id: string, label: string): Node {
  return { id, type: "mindmap", position: { x: 0, y: 0 }, data: { label } };
}

describe("findMindmapNodeIds", () => {
  it("finds label matches case-insensitively in node order", () => {
    expect(
      findMindmapNodeIds(
        [node("first", "Cell membrane"), node("second", "Mitosis")],
        "MITO",
      ),
    ).toEqual(["second"]);
  });

  it("ignores blank queries and image nodes without labels", () => {
    const image: Node = {
      id: "image",
      type: "image",
      position: { x: 0, y: 0 },
      data: { kind: "image" },
    };

    expect(findMindmapNodeIds([image], "  ")).toEqual([]);
    expect(findMindmapNodeIds([image], "image")).toEqual([]);
  });
});
